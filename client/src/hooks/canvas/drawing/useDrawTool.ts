import { useCallback, useRef, useState } from 'react';
import {
	StoreStrokeInterpolatedPointsFn,
	useCanvasState,
} from '../state/useCanvasState';
import { useRoomPacketBuilder } from '../../networking/packets/usePacketBuilder';
import {
	DrawingPacket,
	DrawingPoint,
	PacketStatus,
	PacketType,
	ToolInstance,
} from '@/types';
import { DrawDotOnCanvasFn, DrawIncrementalPathFn } from './useCanvasDrawing';
import logger from '../../../util/logger';

interface UseDrawToolProps {
	brushColor: string;
	brushSize: number;
	roomPacketBuilder: ReturnType<typeof useRoomPacketBuilder>;
	canvasState: ReturnType<typeof useCanvasState>;
	drawDotOnCanvas: DrawDotOnCanvasFn;
	drawIncrementalPath: DrawIncrementalPathFn;
	handlePacketSending: () => boolean;
	storeStrokeInterpolatedPoints: StoreStrokeInterpolatedPointsFn;
}

export const useDrawTool = ({
	brushColor,
	brushSize,
	roomPacketBuilder,
	canvasState,
	drawDotOnCanvas,
	drawIncrementalPath,
	handlePacketSending,
	storeStrokeInterpolatedPoints,
}: UseDrawToolProps): ToolInstance => {
	const [isDrawing, setIsDrawing] = useState(false);
	const strokePointsRef = useRef<DrawingPoint[]>([]);

	const startInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
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

			drawDotOnCanvas(pos, PacketType.DRAWING);

			logger.debug(
				'draw packet strokeId: ',
				roomPacketBuilder.getCurrentStrokeId(),
			);
		},
		[brushSize, brushColor, roomPacketBuilder, drawDotOnCanvas],
	);

	const continueInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isDrawing) {
				return;
			}

			const nativeEvent = e.nativeEvent as any;
			const events = nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];

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
			packets.forEach((packet: DrawingPacket) => {
				// Store the packets to map
				canvasState.storePacket(packet);
				const previousPacket = canvasState.getPreviousPacket(packet);

				const { interpolatedPoints, didInterpolated } = drawIncrementalPath(
					previousPacket,
					packet,
				);

				if (didInterpolated)
					w(
						packet.strokeId,
						packet.packetId,
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
			PacketType.DRAWING,
		);
		canvasState.storePacket(packet);
		handlePacketSending();

		const previousPacket = canvasState.getPreviousPacket(packet);

		const { interpolatedPoints, didInterpolated } = drawIncrementalPath(
			previousPacket,
			packet,
		);

		if (didInterpolated)
			storeStrokeInterpolatedPoints(
				packet.strokeId,
				packet.packetId,
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
