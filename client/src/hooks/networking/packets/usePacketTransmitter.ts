'use client';

import { useCallback } from 'react';
import { CLIENT_EVENTS } from '../../../../../shared/constants/socketIo.constant';
import logger from 'src/util/loggerTest';
import {
	MessageStatus,
	CanvasMessage,
	MessageCategory,
	CanvasEvent,
	CanvasOperation,
	EraseEvent,
} from '@/types';
import { useSocketEmit } from '../socket/useSocketEmit';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import { useSocketStore } from 'src/store/socketStore';
import { usePacketErrorHandler } from 'src/hooks/canvas/drawing/usePacketErrorHandler';

export type HandlePacketSendingFn = ReturnType<
	typeof usePacketTransmitter
>['handlePacketSending'];

export type SendPacketFn = (packet: CanvasMessage) => Promise<void>;

const usePacketTransmitter = (
	redrawCanvasWithoutErasedStrokes: () => void,
	eraseStroke: (strokeId: string) => void,
) => {
	const socket = useSocketStore((state) => state.socket);
	const { emit } = useSocketEmit(socket);

	const toNetworkDrawingPacket = (packet: CanvasOperation) => {
		const { status, lastAttemptTimestamp, timestamp, ...networkData } = packet;
		return networkData;
	};

	const { wrapCallback, handleCallbackError } = usePacketErrorHandler({
		redrawCanvasWithoutErasedStrokes,
		eraseStroke,
	});

	const sendDrawingPacket = useCallback(
		async (packet: CanvasOperation) => {
			canvasState.updatePacketStatus(
				packet.strokeId,
				packet.canvasMessageId,
				MessageStatus.SENDING,
			);

			try {
				const result = await emit(
					CLIENT_EVENTS.CANVAS_OPERATION,
					toNetworkDrawingPacket(packet),
					{
						onSent: () =>
							canvasState.updatePacketStatus(
								packet.strokeId,
								packet.canvasMessageId,
								MessageStatus.SENT,
							),
					},
				);

				if (result.success) {
					canvasState.updatePacketStatus(
						packet.strokeId,
						packet.canvasMessageId,
						MessageStatus.ACKNOWLEDGED,
					);
				} else if (result.error) {
					// Server rejected via callback

					wrapCallback(packet.strokeId)(result);
					canvasState.updatePacketStatus(
						packet.strokeId,
						packet.canvasMessageId,
						MessageStatus.FAILED,
					);
				}
			} catch (e) {
				canvasState.updatePacketStatus(
					packet.strokeId,
					packet.canvasMessageId,
					MessageStatus.FAILED,
				);
				logger.error(
					{
						canvasMessageId: packet.canvasMessageId,
						error: e instanceof Error ? e.message : e,
					},
					'DrawingOperation send failed',
				);
			}
		},
		[emit, wrapCallback],
	);

	const sendEventPacket = useCallback(
		async (packet: CanvasEvent) => {
			try {
				const result = await emit(CLIENT_EVENTS.CANVAS_OPERATION, packet);
				logger.debug({ result }, 'EMIT EVENT RESULT');

				if (!result.success && result.error) {
					const strokeIds = (packet as EraseEvent).erasedStrokeIds ?? [];
					// strokeIds.forEach((id) => canvasState.unmarkStrokeErased(id));
					handleCallbackError(result.error);
				}
			} catch (e) {
				logger.error(
					{
						canvasMessageId: packet.canvasMessageId,
						error: e instanceof Error ? e.message : e,
					},
					'CanvasEvent send failed',
				);
			}
		},
		[emit, handleCallbackError],
	);

	const sendPacket = useCallback(
		(packet: CanvasMessage) => {
			if (!socket?.connected) {
				logger.error(
					{
						socketExists: !!socket,
						socketConnected: socket?.connected,
						category: packet.category,
					},
					'user isnt connected',
				);
				return;
			}

			switch (packet.category) {
				case MessageCategory.DRAWING:
					return sendDrawingPacket(packet);
				case MessageCategory.EVENT:
					return sendEventPacket(packet);
			}
		},
		[socket, sendDrawingPacket, sendEventPacket],
	);

	const handlePacketSending = useCallback(() => {
		const packetsToSend = canvasState.getAllPacketsToSend();
		logger.debug(packetsToSend);
		packetsToSend.forEach(sendPacket);
		return true;
	}, [sendPacket, socket]);

	return {
		handlePacketSending,
		sendPacket,
	};
};

export default usePacketTransmitter;
