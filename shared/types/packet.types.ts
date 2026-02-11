export interface BasePoint {
	x: number;
	y: number;
	timestamp?: number;
}

export enum PacketType {
	DRAWING = 'drawing',
	ERASER = 'eraser',
	LASSO = 'lasso',
}

export interface DrawingPoint extends BasePoint {
	brushSize: number;
	brushColor: string;
}

export interface EraserPoint extends BasePoint {
	brushSize: number;
}

export interface LassoPoint extends BasePoint {
	// not implemented yet
}

export type PacketTypeToPoints = {
	[PacketType.DRAWING]: DrawingPoint;
	[PacketType.ERASER]: EraserPoint;
	[PacketType.LASSO]: LassoPoint;
};

export type CanvasPoint = EraserPoint | DrawingPoint | LassoPoint;
export enum PacketStatus {
	CREATED = 'CREATED', // Just created, not sent yet
	SENDING = 'SENDING', // Currently being sent
	SENT = 'SENT',
	ACKNOWLEDGED = 'ACKNOWLEDGED', // Server sent back ack
	RECEIVED = 'RECEIVED', // Received from another user
	FAILED = 'FAILED', // Failed, will retry
	ABANDONED = 'ABANDONED', // Max retries reached, gave up sending
}

/**
 * Base packet interface containing all shared fields across packet types.
 * This is not exported directly - use the Packet discriminated union instead.
 *
 * @remarks
 * Fields are organized into three categories:
 * - Network Metadata: Core fields sent over the wire for ordering/deduplication
 * - Drawing Data: The actual point data and author information
 * - Status Tracking: Client-side only fields for retry logic and debugging
 */
interface BasePacket {
	// ===== Network Metadata =====
	// Sent over the wire
	roomId: string; // Which room/canvas this belongs to
	strokeId: string; // Unique ID for the entire stroke
	packetId: string; // Unique ID for this specific packet
	packetSequenceNumber: number; // Order within the stroke (1, 2, 3...)
	strokeSequenceNumber: number; // Order of local strokes
	isLastPacket?: boolean; // True if this is the final packet of a stroke
	isErased: boolean; // Whether this stroke has been erased (for replay/undo)

	// ===== Drawing Data =====
	// Sent over the wire
	authorId: string; // User who created this packet

	// ===== Status Tracking =====
	// Client-side only (not sent over network)
	status: PacketStatus; // Current transmission status
	lastAttemptTimestamp?: number; // When we last tried to send this packet
	timestamp?: number; // Client creation time for debugging/ordering
}

/**
 * Discriminated union of packet types.
 * The `type` field determines which point type the packet contains.
 *
 * @remarks
 * This ensures type safety at compile time:
 * - PacketType.DRAWING → must contain DrawingPoint[]
 * - PacketType.ERASER → must contain EraserPoint[]
 * - PacketType.LASSO → must contain LassoPoint[]
 *
 * TypeScript will automatically narrow the point type when you switch on packet.type,
 * eliminating the need for type guards or assertions.
 *
 * @example
 * function handlePacket(packet: Packet) {
 *   switch (packet.type) {
 *     case PacketType.DRAWING:
 *       const color = packet.points[0].brushColor;
 *       break;
 *     case PacketType.ERASER:
 *       const size = packet.points[0].brushSize;
 *       break;
 *   }
 * }
 */

export type DrawingPacket = BasePacket & {
	type: PacketType.DRAWING;
	points: DrawingPoint[]; // Must have brushSize and brushColor
};
export type EraserPacket = BasePacket & {
	type: PacketType.ERASER;
	points: EraserPoint[]; // Must have brushSize only
};
export type LassoPacket = BasePacket & {
	type: PacketType.LASSO;
	points: LassoPoint[]; // Just x, y coordinates
};

export type Packet = DrawingPacket | EraserPacket | LassoPacket;

/**
 * Network-serializable version of Packet.
 * Omits client-only fields that should not be sent over the wire.
 *
 * @remarks
 * Use this type when:
 * - Serializing packets for WebSocket transmission
 * - Storing packets in Redis streams
 * - Any other network/storage operation where client state is irrelevant
 *
 * The discriminated union structure is preserved, so type narrowing still works:
 * function serializePacket(packet: NetworkPacket) {
 *   switch (packet.type) {
 *     case PacketType.DRAWING:
 *        packet.points is still DrawingPoint[]
 *   }
 * }
 */
export type NetworkPacket = Omit<
	Packet,
	'status' | 'lastAttemptTimestamp' | 'timestamp'
>;

/**
 * Bounding box information for packets' point data.
 * Used for spatial indexing and collision detection.
 *
 * @remarks
 * Can be computed from a packet's points to determine:
 * - Which strokes intersect with an eraser path
 * - Which strokes are within a lasso selection
 * - Efficient canvas viewport culling
 */
export interface BoundingBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}
