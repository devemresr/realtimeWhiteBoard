import { useCallback, useEffect, useRef, useState } from 'react';
import {
	EraserPacket,
	EraserPoint,
	Packet,
	PacketStatus,
	PacketType,
	ToolInstance,
} from '@/types';
import { useEraserManager } from './useEraserManager';
import logger from '../../../util/logger';
import { useRoomPacketBuilder } from '../../networking/packets/usePacketBuilder';
import { useCanvasState } from '../state/useCanvasState';
import { GetEnrichedInterpolatedPointsFn } from './useCanvasDrawing';

interface UseEraserToolProps {
	canvasRef;
	canvasState: ReturnType<typeof useCanvasState>;
	eraserSize: number;
	eraserManager: ReturnType<typeof useEraserManager>;
	roomPacketBuilder: ReturnType<typeof useRoomPacketBuilder>;
	getEnrichedInterpolatedPoints: GetEnrichedInterpolatedPointsFn;
	handlePacketSending: () => boolean;
}

export const useEraserTool = ({
	canvasRef,
	canvasState,
	eraserSize,
	eraserManager,
	roomPacketBuilder,
	getEnrichedInterpolatedPoints,
	handlePacketSending,
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

	const { eraseAtPoint } = eraserManager;

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

			logger.debug('@ started Erasing at point: ', pos);
			// Erase at starting point
			const erasedStrokeIds = eraseAtPoint(pos, eraserSize);
			logger.debug('@ erasedStrokeIds in start erasing: ', erasedStrokeIds);
		},
		[eraserSize, eraseAtPoint, roomPacketBuilder],
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

			// Store the packets to map and run eraser functionality
			packets.forEach((packet: EraserPacket) => {
				// Store the packets to map
				const previousPacket = canvasState.getPreviousPacket(packet);
				const interpolatedPoints = getEnrichedInterpolatedPoints(
					previousPacket,
					packet,
				);

				interpolatedPoints.forEach((point: EraserPoint) => {
					eraseAtPoint(point, eraserSize);
				});
			});
		},
		[
			isErasing,
			eraserSize,
			eraseAtPoint,
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
			PacketType.ERASER,
		);
		packet.points.forEach((point: EraserPoint) => {
			eraseAtPoint(point);
		});

		// canvasState.storePacket(packet);

		handlePacketSending();

		eraserPathCache.current = [];
	}, [isErasing, roomPacketBuilder, canvasState, handlePacketSending]);

	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isInteracting: isErasing,
	};
};
