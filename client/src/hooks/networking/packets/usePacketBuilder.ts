import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
	Packet,
	DrawingPoint,
	PacketStatus,
	BasePoint,
	EraserPoint,
	DrawingPacket,
	PacketType,
	EraserPacket,
	CanvasPoint,
	LassoPoint,
	LassoPacket,
	PacketTypeToPoints,
} from '@/types';
import logger from '../../../util/logger';

/**
 * Base configuration options for packet builders
 */
interface BasePacketOptions {
	/** Number of points to include per packet. Defaults to 2 */
	pointsPerPacket?: number;
}

/**
 * Configuration options for room-based packet builders
 * Extends base options with room identification
 */
interface RoomPacketOptions extends BasePacketOptions {
	/** Unique identifier for the room */
	roomId: string;
}

/**
 * Hook for creating packet builders in multiplayer room contexts
 */
export const useRoomPacketBuilder = (options: RoomPacketOptions) => {
	const strokeId = useRef<string>('');
	const packetSequenceNumber = useRef(1);
	const strokeSequenceNumber = useRef(1);

	const POINTS_PER_PACKET = options.pointsPerPacket ?? 2;
	const roomId = 'room2'; // todo pass the actual roomId

	const generateStrokeId = () => {
		return `${Date.now()}-${uuidv4()}`;
	};

	const createNewStrokeMetaData = () => {
		strokeId.current = generateStrokeId();
		packetSequenceNumber.current = 1;
		strokeSequenceNumber.current += 1;
	};

	const getCurrentStrokeId = () => {
		return strokeId.current;
	};

	const buildPacketsFromPoints = <TPoint extends BasePoint, TPacket>(
		points: TPoint[],
		packetFactory: (points: TPoint[], sequenceNumber: number) => TPacket,
	): {
		packets: TPacket[];
		remainingPoints: TPoint[];
		packetSequenceNumber: number;
	} => {
		const packets: TPacket[] = [];
		const completePackets = Math.floor(points.length / POINTS_PER_PACKET);

		for (let i = 0; i < completePackets; i++) {
			const packetPoints = points.slice(
				i * POINTS_PER_PACKET,
				(i + 1) * POINTS_PER_PACKET,
			);

			const packet = packetFactory(packetPoints, packetSequenceNumber.current);
			packets.push(packet);

			packetSequenceNumber.current += 1;
		}

		const remainingPoints = points.slice(completePackets * POINTS_PER_PACKET);

		return {
			packets,
			remainingPoints,
			packetSequenceNumber: packetSequenceNumber.current,
		};
	};

	const createPacket = <T extends PacketType>(
		points: PacketTypeToPoints[T][],
		seqNum: number,
		type: T,
		context: {
			roomId: string;
			strokeId: string;
			strokeSequenceNumber: number;
		},
	) => {
		const basePacket = {
			roomId: context.roomId,
			strokeId: context.strokeId,
			packetId: `${context.strokeId}-${seqNum}`,
			packetSequenceNumber: seqNum,
			strokeSequenceNumber: context.strokeSequenceNumber,
			type,
			isErased: false as const,
			authorId: 'anonymous',
			status: PacketStatus.CREATED,
			points,
			timestamp: Date.now(),
		} as const;

		return basePacket as Extract<Packet, { type: T }>;
	};

	const buildPackets = <T extends PacketType>(
		points: PacketTypeToPoints[T][],
		type: T,
	) => {
		return buildPacketsFromPoints(points, (pts, seqNum) =>
			createPacket(pts, seqNum, type, {
				roomId,
				strokeId: strokeId.current,
				strokeSequenceNumber: strokeSequenceNumber.current,
			}),
		);
	};

	const buildStrokePackets = (points: DrawingPoint[]) => {
		return buildPackets(points, PacketType.DRAWING);
	};

	const buildEraserPackets = (points: EraserPoint[]) => {
		return buildPackets(points, PacketType.ERASER);
	};

	const buildLassoPackets = (points: LassoPoint[]) => {
		return buildPackets(points, PacketType.LASSO);
	};

	const buildFinalPacket = <T extends PacketType>(
		points: CanvasPoint[],
		type: T,
	): Extract<Packet, { type: T }> => {
		const authorId = 'anonymous';

		const basePacket = {
			roomId,
			strokeId: strokeId.current,
			packetId: `${strokeId.current}-${packetSequenceNumber.current}`,
			packetSequenceNumber: packetSequenceNumber.current,
			strokeSequenceNumber: strokeSequenceNumber.current,
			isLastPacket: true as const,
			isErased: false as const,
			status: PacketStatus.CREATED,
			authorId,
			timestamp: Date.now(),
			type,
			points,
		} as const;

		return basePacket as Extract<Packet, { type: T }>;
	};

	return {
		buildFinalPacket,
		buildStrokePackets,
		buildEraserPackets,
		getCurrentStrokeId,
		buildLassoPackets,
		createNewStrokeMetaData,
		POINTS_PER_PACKET,
	};
};

/**
 * Hook for creating packet builders in local/offline contexts
 */
export const useLocalPacketBuilder = (options: BasePacketOptions = {}) => {
	return useRoomPacketBuilder({ ...options, roomId: 'local' });
};
