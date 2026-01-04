export type Point = {
	x: number;
	y: number;
	brushSize: number;
	brushColor: string;
	timestamp?: number;
};

export enum PacketStatus {
	CREATED = 'CREATED', // Just created, not sent yet
	SENDING = 'SENDING', // Currently being sent
	SENT = 'SENT', // Acknowledged by server
	FAILED = 'FAILED', // Failed, will retry
	ABANDONED = 'ABANDONED', // Max retries reached, gave up sending
}

/**
 * Represents a packet of stroke data for network transmission.
 *
 * @remarks
 * - Fields marked as "Client-side only" are not serialized for network transmission
 * - Network metadata ensures proper ordering and deduplication
 * - Status tracking enables retry logic and debugging
 */
export interface StrokePacket {
	// ===== Network Metadata =====
	// Sent over the wire
	roomId: string;
	strokeId: string;
	packetId: string;
	packetSequenceNumber: number;
	strokeSequenceNumber: number;
	isLastPacket?: boolean;

	// ===== Drawing Data =====
	// Sent over the wire
	points: Point[];
	authorId: string;

	// ===== Status Tracking =====
	// Client-side only (not sent over network)
	status?: PacketStatus;
	lastAttemptTimestamp?: number;
	timestamp?: number; // Client creation time for debugging/ordering
}

/**
 * Network-serializable version of StrokePacket (omits client-only fields)
 */
export type NetworkStrokePacket = Omit<
	StrokePacket,
	'status' | 'lastAttemptTimestamp' | 'timestamp'
>;

/**
 * Packet with guaranteed status (for internal state management)
 */
export type TrackedStrokePacket = StrokePacket & {
	status: PacketStatus;
	lastAttemptTimestamp: number;
};
