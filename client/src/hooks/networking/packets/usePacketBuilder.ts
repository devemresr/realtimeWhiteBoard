import { v4 as uuidv4 } from 'uuid';
import {
	CanvasOperation,
	DrawingPoint,
	MessageStatus,
	BasePoint,
	EraserPoint,
	CanvasOperationType,
	CanvasPoint,
	LassoPoint,
	CanvasOperationTypeToPoints,
	MessageCategory,
} from '@/types';

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
	userId: string;
}

/**
 * Builds typed canvas operation packets for a single tool (drawing, eraser, lasso).
 *
 * Each tool hook should instantiate its own RoomPacketBuilder and hold it behind
 * a useRef so the instance - and therefore the stroke/sequence state - survives
 * re-renders without being shared across tools:
 *
 *   const builderRef = useRef(new RoomPacketBuilder({ roomId }));
 *   use builderRef.current throughout the hook
 *
 * Keeping one instance per tool means there is no risk of one tool's
 * createNewStrokeMetaData() call corrupting another tool's in-flight sequence numbers.
 */
export class RoomPacketBuilder {
	private roomId: string;
	private userId: string;
	readonly POINTS_PER_PACKET: number;

	/** Unique ID for the current stroke, reset on every new stroke */
	private strokeId: string = '';
	/** Increments with every packet emitted within a stroke, reset on new stroke */
	private packetSequenceNumber: number = 1;
	/** Increments with every new stroke, never reset */
	private strokeSequenceNumber: number = 0;

	constructor(options: RoomPacketOptions) {
		this.roomId = options.roomId;
		this.userId = options.userId;
		this.POINTS_PER_PACKET = options.pointsPerPacket ?? 2;
	}

	// ---------------------------------------------------------------------------
	// Stroke lifecycle
	// ---------------------------------------------------------------------------

	private generateStrokeId(): string {
		return `${Date.now()}-${uuidv4()}`;
	}

	/**
	 * Must be called once at the start of every new stroke.
	 * Resets the packet sequence counter and advances the stroke sequence counter.
	 */
	createNewStrokeMetaData(): void {
		this.strokeId = this.generateStrokeId();
		this.packetSequenceNumber = 1;
		this.strokeSequenceNumber += 1;
	}

	getCurrentStrokeId(): string {
		return this.strokeId;
	}

	// ---------------------------------------------------------------------------
	// Packet construction
	// ---------------------------------------------------------------------------

	private createPacket<T extends CanvasOperationType>(
		points: CanvasOperationTypeToPoints[T][],
		seqNum: number,
		type: T,
	): Extract<CanvasOperation, { type: T }> {
		const basePacket = {
			roomId: this.roomId,
			strokeId: this.strokeId,
			canvasMessageId: `${this.strokeId}-${seqNum}`,
			packetSequenceNumber: seqNum,
			strokeSequenceNumber: this.strokeSequenceNumber,
			category: MessageCategory.DRAWING,
			type,
			authorId: this.userId,
			status: MessageStatus.CREATED,
			points,
			timestamp: Date.now(),
		} as const;

		return basePacket as Extract<CanvasOperation, { type: T }>;
	}

	/**
	 * Slices `points` into fixed-size packets using the configured POINTS_PER_PACKET.
	 * Any leftover points that don't fill a complete packet are returned as remainingPoints
	 * so the caller can carry them forward to the next batch.
	 */
	private buildPacketsFromPoints<TPoint extends BasePoint, TPacket>(
		points: TPoint[],
		packetFactory: (points: TPoint[], sequenceNumber: number) => TPacket,
	): {
		packets: TPacket[];
		remainingPoints: TPoint[];
		packetSequenceNumber: number;
	} {
		const packets: TPacket[] = [];
		const completePackets = Math.floor(points.length / this.POINTS_PER_PACKET);

		for (let i = 0; i < completePackets; i++) {
			const packetPoints = points.slice(
				i * this.POINTS_PER_PACKET,
				(i + 1) * this.POINTS_PER_PACKET,
			);

			const packet = packetFactory(packetPoints, this.packetSequenceNumber);
			packets.push(packet);

			this.packetSequenceNumber += 1;
		}

		const remainingPoints = points.slice(
			completePackets * this.POINTS_PER_PACKET,
		);

		return {
			packets,
			remainingPoints,
			packetSequenceNumber: this.packetSequenceNumber,
		};
	}

	private buildPackets<T extends CanvasOperationType>(
		points: CanvasOperationTypeToPoints[T][],
		type: T,
	) {
		return this.buildPacketsFromPoints(points, (pts, seqNum) =>
			this.createPacket(pts, seqNum, type),
		);
	}

	buildStrokePackets(points: DrawingPoint[]) {
		return this.buildPackets(points, CanvasOperationType.DRAWING);
	}

	buildEraserPackets(points: EraserPoint[]) {
		return this.buildPackets(points, CanvasOperationType.ERASER);
	}

	buildLassoPackets(points: LassoPoint[]) {
		return this.buildPackets(points, CanvasOperationType.LASSO);
	}

	/**
	 * Builds the final packet for a stroke, marked with isLastPacket: true.
	 * Should be called once after all intermediate packets have been emitted.
	 */
	buildFinalPacket<T extends CanvasOperationType>(
		points: CanvasPoint[],
		type: T,
	): Extract<CanvasOperation, { type: T }> {
		const basePacket = {
			roomId: this.roomId,
			strokeId: this.strokeId,
			canvasMessageId: `${this.strokeId}-${this.packetSequenceNumber}`,
			packetSequenceNumber: this.packetSequenceNumber,
			strokeSequenceNumber: this.strokeSequenceNumber,
			isLastPacket: true as const,
			status: MessageStatus.CREATED,
			category: MessageCategory.DRAWING,
			authorId: this.userId,
			timestamp: Date.now(),
			type,
			points,
		} as const;

		return basePacket as Extract<CanvasOperation, { type: T }>;
	}
}

/**
 * Variant for local/offline contexts - uses a fixed 'local' roomId.
 * Instantiate and hold behind a useRef exactly like RoomPacketBuilder.
 */
export class LocalPacketBuilder extends RoomPacketBuilder {
	constructor(options: BasePacketOptions = {}) {
		super({ ...options, roomId: 'local', userId: 'local' });
	}
}
