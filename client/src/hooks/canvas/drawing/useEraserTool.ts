import { useCallback, useEffect, useRef, useState } from 'react';
import {
	EraseEvent,
	EraserOperation,
	EraserPoint,
	EventType,
	CanvasOperationType,
	MessageCategory,
} from '@/types';
import { ToolInstance } from 'src/types/tool.types';
import logger from '../../../util/logger';
import usePacketTransmitter, {
	HandlePacketSendingFn,
	SendPacketFn,
} from '../../networking/packets/usePacketTransmitter';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import {
	LocalPacketBuilder,
	RoomPacketBuilder,
} from 'src/hooks/networking/packets/usePacketBuilder';
import {
	EraseAtPointFn,
	EraseWithInterpolatedPathFn,
} from './useEraserManager';
import { useRoomStatusStore } from 'src/store/RoomStore';
import { useUserStore } from 'src/store/UserStore';
import { v4 as uuidv4 } from 'uuid';

interface UseEraserToolProps {
	eraserSize: number;
	getEnrichedInterpolatedPoints;
	eraseWithInterpolatedPath: EraseWithInterpolatedPathFn;
	eraseAtPoint: EraseAtPointFn;
	sendPacket: SendPacketFn;
}

export const useEraserTool = ({
	eraserSize,
	getEnrichedInterpolatedPoints,
	eraseWithInterpolatedPath,
	eraseAtPoint,
	sendPacket,
}: UseEraserToolProps): ToolInstance => {
	const [isErasing, setIsErasing] = useState(false);
	const eraserPathCache = useRef<EraserPoint[]>([]);
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

	const handleEraseEvents = useCallback(
		(erasedStrokeIds: string[]) => {
			if (!roomId || !userId) {
				logger.error({ roomId, userId }, 'Cannot send erase event');
				return;
			}
			if (erasedStrokeIds.length > 0) {
				const EraseEvent: EraseEvent = {
					authorId: userId,
					canvasMessageId: `${Date.now()}-${uuidv4()}`,
					roomId,
					erasedStrokeIds,
					category: MessageCategory.EVENT,

					type: EventType.ERASE,
				};
				logger.debug('EraseEvent: ', EraseEvent);
				sendPacket(EraseEvent);
			}
		},
		[userId, roomId, sendPacket],
	);

	const startInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			setIsErasing(true);
			const { offsetX, offsetY } = e.nativeEvent;

			const pos: EraserPoint = {
				x: offsetX,
				y: offsetY,
				timestamp: Date.now(),
				brushSize: eraserSize,
			};

			eraserPathCache.current = [pos];
			roomPacketBuilderRef.current.createNewStrokeMetaData();
			logger.debug(
				'eraser packet strokeId: ',
				roomPacketBuilderRef.current.getCurrentStrokeId(),
			);
			roomPacketBuilderRef.current.buildEraserPackets([pos]);

			// Erase at starting point (single point, no interpolation needed)
			const erasedStrokeIds = eraseAtPoint(pos, eraserSize);
			handleEraseEvents(erasedStrokeIds);
		},
		[eraserSize, eraseAtPoint, handleEraseEvents],
	);

	const continueInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isErasing) return;

			const nativeEvent = e.nativeEvent as any;
			const events = nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];

			for (const event of events) {
				const { offsetX, offsetY } = event;
				const pos: EraserPoint = {
					x: offsetX,
					y: offsetY,
					timestamp: Date.now(),
					brushSize: eraserSize,
				};
				eraserPathCache.current.push(pos);
			}

			// Create packets from current points
			const { packets, remainingPoints } =
				roomPacketBuilderRef.current.buildEraserPackets(
					eraserPathCache.current,
				);

			// Update the ref to only keep remaining points
			eraserPathCache.current = remainingPoints;

			// Send packages over network
			// if (roomPacketBuilderRef.current instanceof LocalPacketBuilder === false)
			// 	handlePacketSending();

			// Process each eraser packet with interpolation
			packets.forEach((packet: EraserOperation) => {
				const previousPacket = canvasState.getPreviousPacket(packet);

				// Get interpolated points for this eraser packet
				const eraserInterpolatedPoints = getEnrichedInterpolatedPoints(
					previousPacket,
					packet,
				);

				canvasState.storePacket(packet);

				// Erase using the interpolated path
				const erasedStrokeIds = eraseWithInterpolatedPath(
					eraserInterpolatedPoints,
					eraserSize,
				);
				handleEraseEvents(erasedStrokeIds);
			});
		},
		[
			isErasing,
			eraserSize,
			getEnrichedInterpolatedPoints,
			// handlePacketSending,
			handleEraseEvents,
			eraseWithInterpolatedPath,
		],
	);

	const endInteraction = useCallback(() => {
		if (!isErasing) return;
		setIsErasing(false);

		const packet = roomPacketBuilderRef.current.buildFinalPacket(
			eraserPathCache.current,
			CanvasOperationType.ERASER,
		);

		// Erase at each remaining point
		const previousPacket = canvasState.getPreviousPacket(packet);
		const eraserInterpolatedPoints = getEnrichedInterpolatedPoints(
			previousPacket,
			packet,
		);
		const erasedStrokeIds = eraseWithInterpolatedPath(
			eraserInterpolatedPoints,
			eraserSize,
		);
		handleEraseEvents(erasedStrokeIds);

		canvasState.storePacket(packet);
		// if (roomPacketBuilderRef.current instanceof LocalPacketBuilder === false)
		// 	handlePacketSending();
		eraserPathCache.current = [];
	}, [
		isErasing,
		eraseWithInterpolatedPath,
		handleEraseEvents,
		eraserSize,
		canvasState,
	]);
	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isInteracting: isErasing,
	};
};
