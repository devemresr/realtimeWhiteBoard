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
import { useEraserManager } from './useEraserManager';
import logger from '../../../util/logger';
import { useRoomPacketBuilder } from '../../networking/packets/usePacketBuilder';
import { useCanvasState } from '../state/useCanvasState';
import usePacketTransmitter from '../../networking/packets/usePacketTransmitter';

interface UseEraserToolProps {
	canvasRef;
	canvasState: ReturnType<typeof useCanvasState>;
	eraserSize: number;
	eraserManager: ReturnType<typeof useEraserManager>;
	roomPacketBuilder: ReturnType<typeof useRoomPacketBuilder>;
	getEnrichedInterpolatedPoints;
	packetTransmitter: ReturnType<typeof usePacketTransmitter>;
}

export const useEraserTool = ({
	canvasRef,
	canvasState,
	eraserSize,
	eraserManager,
	roomPacketBuilder,
	getEnrichedInterpolatedPoints,
	packetTransmitter,
}: UseEraserToolProps): ToolInstance => {
	const setupContext = useCallback(() => {
		if (!canvasRef.current || ctxRef.current) return;
		const ctx = canvasRef.current.getContext('2d');
		if (!ctx) return;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctxRef.current = ctx;
	}, []);

	useEffect(() => {
		setupContext();
	}, [canvasRef.current, setupContext]);

	const ctxRef = useRef(null);
	const [isErasing, setIsErasing] = useState(false);
	const eraserPathCache = useRef<EraserPoint[]>([]);
	const { handlePacketSending } = packetTransmitter;

	const handleEraseEvents = (erasedStrokeIds: string[]) => {
		if (erasedStrokeIds.length > 0) {
			const EraseEvent: EraseEvent = {
				erasedStrokeIds,
				category: MessageCategory.EVENT,
				type: EventType.ERASE,
			};
			logger.debug('EraseEvent: ', EraseEvent);
			packetTransmitter.sendPacket(EraseEvent);
		}
	};

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
			roomPacketBuilder.createNewStrokeMetaData();
			logger.debug(
				'eraser packet strokeId: ',
				roomPacketBuilder.getCurrentStrokeId(),
			);
			roomPacketBuilder.buildEraserPackets([pos]);
			handlePacketSending();

			// Erase at starting point (single point, no interpolation needed)
			const erasedStrokeIds = eraserManager.eraseAtPoint(pos, eraserSize);
			handleEraseEvents(erasedStrokeIds);
		},
		[eraserSize, eraserManager, roomPacketBuilder, handlePacketSending],
	);

	const continueInteraction = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isErasing || !ctxRef.current) return;

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
			const { packets, remainingPoints } = roomPacketBuilder.buildEraserPackets(
				eraserPathCache.current,
			);

			// Update the ref to only keep remaining points
			eraserPathCache.current = remainingPoints;

			// Send packages over network
			handlePacketSending();

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
				const erasedStrokeIds = eraserManager.eraseWithInterpolatedPath(
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
			handlePacketSending,
			canvasState,
			roomPacketBuilder,
		],
	);

	const endInteraction = useCallback(() => {
		if (!isErasing) return;
		setIsErasing(false);

		const packet = roomPacketBuilder.buildFinalPacket(
			eraserPathCache.current,
			CanvasOperationType.ERASER,
		);

		// Erase at each remaining point
		const previousPacket = canvasState.getPreviousPacket(packet);
		const eraserInterpolatedPoints = getEnrichedInterpolatedPoints(
			previousPacket,
			packet,
		);
		const erasedStrokeIds = eraserManager.eraseWithInterpolatedPath(
			eraserInterpolatedPoints,
			eraserSize,
		);
		handleEraseEvents(erasedStrokeIds);

		canvasState.storePacket(packet);
		handlePacketSending();
		eraserPathCache.current = [];
	}, [
		isErasing,
		eraserManager,
		eraserSize,
		roomPacketBuilder,
		canvasState,
		handlePacketSending,
	]);
	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isInteracting: isErasing,
	};
};
