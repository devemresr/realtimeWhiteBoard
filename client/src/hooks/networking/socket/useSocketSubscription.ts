'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SERVER_EVENTS } from '../../../../../shared/constants/socketIo.constant';
import logger from '../../../util/logger';
import { DrawBroadcastPathFn } from '../synchronization/BroadcastRenderer';
import {
	CanvasMessage,
	CanvasOperation,
	CanvasEvent,
	EventType,
	MessageCategory,
	CanvasOperationType,
} from '@/types';
import {
	EraseStrokeFn,
	RedrawCanvasWithoutErasedStrokesFn,
} from 'src/hooks/canvas/drawing/useEraserManager';
export type HandleMessageFn = (data: CanvasMessage) => void;

const useSocketSubscription = (
	socket,
	drawBroadcastPath: DrawBroadcastPathFn,
	eraseStroke: EraseStrokeFn,
	redrawCanvasWithoutErasedStrokes: RedrawCanvasWithoutErasedStrokesFn,
) => {
	const analytics = useRef(null);
	// todo solve the localstorage max usage issue add cleanup for local storage and reactivate monitoring
	// analytics.current = new DrawingAnalytics('user123', 6000);
	// analytics.current.startRealtimeMonitoring(2000);

	const handleCanvasPacket = useCallback(
		(data: CanvasOperation) => {
			logger.debug('Received broadcasted canvas packet:', data);

			switch (data.type) {
				case CanvasOperationType.DRAWING:
					drawBroadcastPath(data);
					break;

				case CanvasOperationType.ERASER:
					// todo remove mock switch to a dedicated cursor
					// const mockEraser = {
					// 	...data,
					// 	points: data.points.map((p) => ({ ...p, brushSize: 1 })),
					// };
					// drawBroadcastPath(mockEraser);
					break;
				default:
					logger.warn('Received packet with unknown type:', data);
			}
		},
		[drawBroadcastPath],
	);

	const handleEvent = useCallback(
		(data: CanvasEvent) => {
			switch (data.type) {
				case EventType.ERASE: {
					logger.debug('Received erase event:', data);

					data.erasedStrokeIds.forEach((strokeId) => {
						eraseStroke(strokeId);
					});

					redrawCanvasWithoutErasedStrokes();
					break;
				}

				default:
					logger.warn('Received packet with unknown type:', data);
			}
		},
		[eraseStroke, redrawCanvasWithoutErasedStrokes],
	);
	const handleMessage: HandleMessageFn = useCallback(
		(data) => {
			switch (data?.category) {
				case MessageCategory.DRAWING:
					handleCanvasPacket(data);
					break;

				case MessageCategory.EVENT:
					handleEvent(data);
					break;

				default:
					logger.warn('Received message with unknown category:', data);
			}
		},
		[handleCanvasPacket, handleEvent],
	);
	useEffect(() => {
		if (!socket) return;
		socket.on(`${SERVER_EVENTS.BROADCAST_OPERATION}`, handleMessage);
		return () => {
			socket.off(SERVER_EVENTS.BROADCAST_OPERATION, handleMessage);
		};
	}, [socket, handleMessage]);

	return { analytics, handleMessage };
};

export default useSocketSubscription;
