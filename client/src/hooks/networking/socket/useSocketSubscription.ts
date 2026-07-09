'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SERVER_EVENTS } from '../../../../../shared/constants/socketIo.constant';
import logger from 'src/util/logger';
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
import { useSocketStore } from 'src/store/socketStore';
import { canvasState } from 'src/util/canvas/state/CanvasState';
export type HandleMessageFn = (data: CanvasMessage) => void;

const useSocketSubscription = (
	drawBroadcastPath: DrawBroadcastPathFn,
	eraseStroke: EraseStrokeFn,
	redrawCanvasWithoutErasedStrokes: RedrawCanvasWithoutErasedStrokesFn,
) => {
	const analytics = useRef(null);
	const socket = useSocketStore((state) => state.socket);
	useEffect(() => {
		console.log(
			'Socket changed in subscription:',
			socket?.id,
			socket?.connected,
		);
	}, [socket]);
	useEffect(() => {
		console.log('SOCKET subscription');
	}, []);

	// todo solve the localstorage max usage issue add cleanup for local storage and reactivate monitoring
	// analytics.current = new DrawingAnalytics('user123', 6000);
	// analytics.current.startRealtimeMonitoring(2000);

	const handleCanvasPacket = useCallback(
		(data: CanvasOperation) => {
			logger.debug({ data }, 'Received broadcasted canvas packet:');

			switch (data.type) {
				case CanvasOperationType.DRAWING:
					drawBroadcastPath(data);
					break;
				default:
					logger.warn({ data }, 'Received packet with unknown type:');
			}
		},
		[drawBroadcastPath],
	);

	const handleEvent = useCallback(
		(data: CanvasEvent) => {
			switch (data.type) {
				case EventType.ERASE: {
					logger.debug({ data }, 'Received erase event:');

					data.erasedStrokeIds.forEach((strokeId) => {
						eraseStroke(strokeId);
					});

					redrawCanvasWithoutErasedStrokes();
					break;
				}
				case EventType.CLEAR_CANVAS: {
					const strokeIds = canvasState.getAllStrokeIds();

					strokeIds.forEach((strokeId) => {
						canvasState.markStrokeErased(strokeId);
						canvasState.removeStrokeFromGrid(strokeId);
					});

					redrawCanvasWithoutErasedStrokes();
					break;
				}
				default:
					logger.warn({ data }, 'Received packet with unknown type:');
			}
		},
		[eraseStroke, redrawCanvasWithoutErasedStrokes],
	);
	const handleMessage: HandleMessageFn = useCallback(
		(data) => {
			logger.debug({ data }, 'HANDLE} MESSAGE REACHED');
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
		console.log(
			'[subscription] socket:',
			socket?.id,
			'connected:',
			socket?.connected,
		);
		if (!socket) return;
		socket.on(SERVER_EVENTS.BROADCAST_OPERATION, handleMessage);
		return () => {
			console.log('[subscription] unregistering handler');
			socket.off(SERVER_EVENTS.BROADCAST_OPERATION, handleMessage);
		};
	}, [socket, handleMessage]);

	return { analytics, handleMessage };
};

export default useSocketSubscription;
