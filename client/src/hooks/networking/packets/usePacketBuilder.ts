import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StrokePacket, Point, PacketStatus } from '@/types';

interface BasePacketOptions {
	pointsPerPacket?: number;
}

interface RoomPacketOptions extends BasePacketOptions {
	roomId: string;
}

const packetBuilder = <T extends BasePacketOptions>(options: T) => {
	const strokeId = useRef<string>('');
	const packetSequenceNumber = useRef(1);
	const strokeSequenceNumber = useRef(1);

	const POINTS_PER_PACKET = options.pointsPerPacket ?? 2;
	const roomId = 'roomId' in options ? (options.roomId as string) : 'local';

	const generateStrokeId = useCallback(() => {
		return `${Date.now()}-${uuidv4()}`;
	}, []);

	const createNewStrokeMetaData = useCallback(() => {
		strokeId.current = generateStrokeId();
		packetSequenceNumber.current = 1;
		strokeSequenceNumber.current += 1;
	}, [generateStrokeId]);

	/**
	 * Creates packets from a buffer of points
	 */
	const buildPacketsFromPoints = useCallback(
		(
			points: Point[],
			isLastPacket?: boolean
		): {
			packets: StrokePacket[];
			remainingPoints: Point[];
			packetSequenceNumber: number;
		} => {
			const packets: StrokePacket[] = [];
			const completePackets = Math.floor(points.length / POINTS_PER_PACKET);

			for (let i = 0; i < completePackets; i++) {
				const packetPoints = points.slice(
					i * POINTS_PER_PACKET,
					(i + 1) * POINTS_PER_PACKET
				);
				// todo pass the usersId
				const authorId = 'anonymous';
				packets.push({
					roomId,
					strokeId: strokeId.current,
					packetId: `${strokeId.current}-${packetSequenceNumber.current}`,
					packetSequenceNumber: packetSequenceNumber.current,
					strokeSequenceNumber: strokeSequenceNumber.current,
					isErased: false,
					authorId,
					isLastPacket,
					status: PacketStatus.CREATED,
					points: packetPoints,
					timestamp: Date.now(),
				});

				packetSequenceNumber.current += 1;
			}

			const remainingPoints = points.slice(completePackets * POINTS_PER_PACKET);

			return {
				packets,
				remainingPoints,
				packetSequenceNumber: packetSequenceNumber.current,
			};
		},
		[POINTS_PER_PACKET, roomId]
	);

	/**
	 * Creates the final packet for a stroke
	 */
	const buildFinalPacket = useCallback(
		(points: Point[]): StrokePacket => {
			// todo get the userId
			const authorId = 'anonymous';
			return {
				roomId,
				strokeId: strokeId.current,
				packetId: `${strokeId.current}-${packetSequenceNumber.current}`,
				packetSequenceNumber: packetSequenceNumber.current,
				strokeSequenceNumber: strokeSequenceNumber.current,
				isLastPacket: true,
				isErased: false,
				authorId,
				points,
				timestamp: Date.now(),
			};
		},
		[roomId]
	);

	return {
		buildPacketsFromPoints,
		buildFinalPacket,
		createNewStrokeMetaData,
		POINTS_PER_PACKET,
	};
};

// public apis
export const useRoomPacketBuilder = (options: RoomPacketOptions) => {
	return packetBuilder(options);
};

export const useLocalPacketBuilder = (options: BasePacketOptions = {}) => {
	return packetBuilder(options);
};
