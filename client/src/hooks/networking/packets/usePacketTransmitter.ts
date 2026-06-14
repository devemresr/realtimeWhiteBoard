'use client';

import { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
	CLIENT_EVENTS,
	SERVER_EVENTS,
} from '../../../../../shared/constants/socketIo.constant';
import logger from '../../../util/logger';
import {
	MessageStatus,
	CanvasMessage,
	MessageCategory,
	CanvasEvent,
	CanvasOperation,
} from '@/types';
import { useCanvasState } from '../../canvas/state/useCanvasState';
import { useSocketEmit } from '../socket/useSocketEmit';

export type HandlePacketSendingFn = ReturnType<
	typeof usePacketTransmitter
>['handlePacketSending'];

const usePacketTransmitter = (
	socket: Socket | null,
	canvasState: ReturnType<typeof useCanvasState>,
) => {
	const { emit } = useSocketEmit(socket);

	const toNetworkDrawingPacket = (packet: CanvasOperation) => {
		const { status, lastAttemptTimestamp, timestamp, ...networkData } = packet;
		return networkData;
	};

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
				logger.debug('result of the packet emit event: ', result);

				if (result.success) {
					canvasState.updatePacketStatus(
						packet.strokeId,
						packet.canvasMessageId,
						MessageStatus.ACKNOWLEDGED,
					);
				}
			} catch (e) {
				canvasState.updatePacketStatus(
					packet.strokeId,
					packet.canvasMessageId,
					MessageStatus.FAILED,
				);
				logger.error('DrawingOperation send failed', {
					canvasMessageId: packet.canvasMessageId,
					error: e instanceof Error ? e.message : e,
				});
			}
		},
		[socket, emit, canvasState],
	);

	const sendEventPacket = useCallback(
		async (packet: CanvasEvent) => {
			try {
				// todo switch to passing the actual roomId
				const data = { ...packet, roomId: 'room2' };
				await emit(CLIENT_EVENTS.CANVAS_OPERATION, data);
			} catch (e) {
				logger.error('CanvasEvent send failed', {
					canvasMessageId: packet.canvasMessageId,
					error: e instanceof Error ? e.message : e,
				});
			}
		},
		[socket, emit],
	);

	const sendPacket = useCallback(
		(packet: CanvasMessage) => {
			if (!socket) {
				logger.error('user isnt connected');
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
		canvasState.getAllPacketsToSend().forEach(sendPacket);
		return true;
	}, [sendPacket, canvasState]);

	return {
		handlePacketSending,
		sendPacket,
	};
};

export default usePacketTransmitter;
