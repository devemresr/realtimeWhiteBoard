'use client';

import { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../../../shared/constants/socketIoConstants';
import logger from '../../../util/logger';
import { PacketStatus, StrokePacket } from '@/types';
import { useCanvasState } from '../../canvas/state/useCanvasState';
import { useSocketEmit } from '../socket/useSocketEmit';

const usePacketTransmitter = (
	socket: Socket | null,
	canvasData: ReturnType<typeof useCanvasState>
) => {
	const { emit } = useSocketEmit(socket);
	/**
	 * Sends a single packets over the network
	 */
	const sendPacket = useCallback(
		async (packet: StrokePacket) => {
			if (!socket) {
				logger.error('user isnt connected');
				return;
			}

			canvasData.updatePacketStatus(
				packet.strokeId,
				packet.packetId,
				PacketStatus.SENDING
			);

			const result = await emit(
				`${SOCKET_EVENTS.DRAWING_PACKET}`,
				toNetworkPacket(packet)
			);
			if (result.success) {
				canvasData.updatePacketStatus(
					packet.strokeId,
					packet.packetId,
					PacketStatus.SENT
				);
			}
			if (result.error) {
				canvasData.updatePacketStatus(
					packet.strokeId,
					packet.packetId,
					PacketStatus.FAILED
				);
				logger.error('Packet send failed', {
					packetId: packet.packetId,
					error: result.error,
				});
			}
		},
		[socket, emit, canvasData, toNetworkPacket]
	);

	function toNetworkPacket(
		packet: StrokePacket
	): Omit<StrokePacket, 'status' | 'lastAttemptTimestamp' | 'timestamp'> {
		const { status, lastAttemptTimestamp, timestamp, ...networkData } = packet;
		return networkData;
	}

	/**
	 * Handle all packet sending logic
	 */
	const handlePacketSending = useCallback(() => {
		const packets = canvasData.getAllPacketsToSend();
		console.log('all the packets to send', packets);

		// Send all created packets
		packets.forEach((packet) => sendPacket(packet));
		return true;
	}, [sendPacket, canvasData]);

	return {
		handlePacketSending,
		sendPacket,
	};
};

export default usePacketTransmitter;
