import { useCallback, useRef, useState } from 'react';
import { useRoomPacketBuilder } from '../../networking/packets/usePacketBuilder';
import { DrawingOperation, DrawingPoint, CanvasOperationType } from '@/types';
import { ToolInstance } from 'src/types/tool.types';
import { DrawDotOnCanvasFn, DrawIncrementalPathFn } from './useCanvasDrawing';
import { HandlePacketSendingFn } from '../../networking/packets/usePacketTransmitter';
import { canvasState } from 'src/util/canvas/CanvasState';

interface UseDrawToolProps {
	brushColor: string;
	brushSize: number;
	roomPacketBuilder: ReturnType<typeof useRoomPacketBuilder>;
	drawDotOnCanvas: DrawDotOnCanvasFn;
	drawIncrementalPath: DrawIncrementalPathFn;
	handlePacketSending: HandlePacketSendingFn;
}

export const useDrawTool = ({
	brushColor,
	brushSize,
	roomPacketBuilder,
	drawDotOnCanvas,
	drawIncrementalPath,
	handlePacketSending,
}: UseDrawToolProps): ToolInstance => {
	const [isDrawing, setIsDrawing] = useState(false);
	const strokePointsRef = useRef<DrawingPoint[]>([]);

	const startInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (e.button === 1) return; // block middle mouse button
			const { offsetX, offsetY } = e.nativeEvent;

			const pos: DrawingPoint = {
				x: offsetX,
				y: offsetY,
				timestamp: Date.now(),
				brushColor: brushColor,
				brushSize: brushSize,
			};

			strokePointsRef.current = [pos];
			setIsDrawing(true);
			roomPacketBuilder.createNewStrokeMetaData();
			const { packets, remainingPoints } = roomPacketBuilder.buildStrokePackets(
				strokePointsRef.current,
			);

			// storePacket is idompotent packets here is likely empty but it gets handled when endInteraction gets called
			packets.forEach((packet) => {
				canvasState.storePacket(packet);
			});
			strokePointsRef.current = remainingPoints;

			drawDotOnCanvas(pos, CanvasOperationType.DRAWING);
		},
		[brushSize, brushColor, roomPacketBuilder, drawDotOnCanvas],
	);

	const continueInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isDrawing) {
				return;
			}

			const nativeEvent = e.nativeEvent as any;
			let events = nativeEvent.getCoalescedEvents?.();

			if (!events?.length) {
				events = [nativeEvent];
			}

			for (const event of events) {
				const { offsetX, offsetY } = event;
				const pos: DrawingPoint = {
					x: offsetX,
					y: offsetY,
					timestamp: Date.now(),
					brushSize,
					brushColor,
				};
				strokePointsRef.current.push(pos);
			}

			console.debug(
				'strokePointsRef.current before getting packeted',
				strokePointsRef.current,
			);

			// Create packets from current points
			const { packets, remainingPoints } = roomPacketBuilder.buildStrokePackets(
				strokePointsRef.current,
			);

			// Update the ref to only keep remaining points
			strokePointsRef.current = remainingPoints;

			// Send packages over network
			handlePacketSending();

			// Render packets locally
			packets.forEach((packet: DrawingOperation) => {
				// Store the packets to map
				canvasState.storePacket(packet);
				const previousPacket = canvasState.getPreviousPacket(packet);

				const { interpolatedPoints, didInterpolated } = drawIncrementalPath(
					previousPacket,
					packet,
				);

				if (didInterpolated)
					canvasState.storeStrokeInterpolatedPoints(
						packet.strokeId,
						packet.canvasMessageId,
						interpolatedPoints as DrawingPoint[],
					);
			});
		},
		[
			isDrawing,
			brushSize,
			brushColor,
			roomPacketBuilder,
			canvasState,
			handlePacketSending,
			drawIncrementalPath,
		],
	);

	const endInteraction = useCallback(() => {
		if (!isDrawing) return;

		const packet = roomPacketBuilder.buildFinalPacket(
			strokePointsRef.current,
			CanvasOperationType.DRAWING,
		);
		canvasState.storePacket(packet);
		handlePacketSending();

		const previousPacket = canvasState.getPreviousPacket(packet);

		const { interpolatedPoints, didInterpolated } = drawIncrementalPath(
			previousPacket,
			packet,
		);

		if (didInterpolated)
			canvasState.storeStrokeInterpolatedPoints(
				packet.strokeId,
				packet.canvasMessageId,
				interpolatedPoints as DrawingPoint[],
			);

		setIsDrawing(false);
		strokePointsRef.current = [];
	}, [isDrawing, roomPacketBuilder, canvasState, handlePacketSending]);

	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isInteracting: isDrawing,
	};
};
