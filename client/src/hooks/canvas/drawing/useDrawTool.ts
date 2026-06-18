import { use, useCallback, useEffect, useRef, useState } from 'react';
import {
	LocalPacketBuilder,
	RoomPacketBuilder,
} from '../../networking/packets/usePacketBuilder';

import { DrawingOperation, DrawingPoint, CanvasOperationType } from '@/types';
import { ToolInstance } from 'src/types/tool.types';
import { DrawDotOnCanvasFn, DrawIncrementalPathFn } from './useCanvasDrawing';
import { HandlePacketSendingFn } from '../../networking/packets/usePacketTransmitter';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import { useUserStore } from 'src/store/UserStore';
import { useRoomStatusStore } from 'src/store/RoomStore';
import logger from 'src/util/loggerTest';

interface UseDrawToolProps {
	brushColor: string;
	brushSize: number;
	drawDotOnCanvas: DrawDotOnCanvasFn;
	drawIncrementalPath: DrawIncrementalPathFn;
	handlePacketSending: HandlePacketSendingFn;
}

export const useDrawTool = ({
	brushColor,
	brushSize,
	drawDotOnCanvas,
	drawIncrementalPath,
	handlePacketSending,
}: UseDrawToolProps): ToolInstance => {
	const [isDrawing, setIsDrawing] = useState(false);
	const strokePointsRef = useRef<DrawingPoint[]>([]);
	const roomId = useRoomStatusStore((state) => state.roomId);
	const userId = useUserStore((state) => state.userId);

	const roomPacketBuilderRef = useRef<RoomPacketBuilder | null>(
		new LocalPacketBuilder(),
	);

	useEffect(() => {
		if (!roomId || !userId) {
			logger.debug({ roomId, userId }, 'local session');
			roomPacketBuilderRef.current = new LocalPacketBuilder();
			return;
		}
		logger.debug({ roomId, userId }, 'room session');
		roomPacketBuilderRef.current = new RoomPacketBuilder({ roomId, userId });
	}, [roomId, userId]);

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
			roomPacketBuilderRef.current.createNewStrokeMetaData();
			const { packets, remainingPoints } =
				roomPacketBuilderRef.current.buildStrokePackets(
					strokePointsRef.current,
				);

			// storePacket is idompotent packets here is likely empty but it gets handled when endInteraction gets called
			packets.forEach((packet) => {
				canvasState.storePacket(packet);
			});
			strokePointsRef.current = remainingPoints;

			drawDotOnCanvas(pos, CanvasOperationType.DRAWING);
		},
		[brushSize, brushColor, drawDotOnCanvas],
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
			const { packets, remainingPoints } =
				roomPacketBuilderRef.current.buildStrokePackets(
					strokePointsRef.current,
				);

			// Update the ref to only keep remaining points
			strokePointsRef.current = remainingPoints;

			// Send packages over network
			if (roomPacketBuilderRef.current instanceof LocalPacketBuilder === false)
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
			handlePacketSending,
			drawIncrementalPath,
		],
	);

	const endInteraction = useCallback(() => {
		if (!isDrawing) return;

		const packet = roomPacketBuilderRef.current.buildFinalPacket(
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
	}, [isDrawing, handlePacketSending]);

	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isInteracting: isDrawing,
	};
};
