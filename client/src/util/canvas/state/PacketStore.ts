import {
	CanvasOperation,
	CanvasOperationType,
	DrawingOperation,
	DrawingPoint,
	MessageStatus,
} from '@/types';
import { BoundingBoxStore } from './BoundingBoxStore';
import { ErasureStore } from './ErasureStore';

/**
 * PacketStore
 *
 * Central store for all CanvasOperation packets (drawing strokes and eraser
 * actions).  It owns the canonical packet data and maintains two auxiliary
 * indexes that make status-based lookups O(1):
 *
 *   pendingSendIndex  - packets waiting to be sent for the first time
 *   needsRetryIndex   - packets that failed and must be retried
 *
 * It also stores interpolated drawing points used for precise eraser
 * collision detection (stored separately to avoid polluting the raw packet).
 *
 * Data layout
 * -----------
 * allPackets:               Map<actionId, Map<canvasMessageId, CanvasOperation>>
 * strokeInterpolatedPoints: Map<strokeId, Map<canvasMessageId, DrawingPoint[]>>
 * pendingSendIndex:         Map<actionId, Set<canvasMessageId>>
 * needsRetryIndex:          Map<actionId, Set<canvasMessageId>>
 */
export class PacketStore {
	/** All packets: actionId -> canvasMessageId -> CanvasOperation */
	private allPackets = new Map<string, Map<string, CanvasOperation>>();

	/**
	 * Interpolated points for drawing strokes only.
	 * Stored separately so they don't bloat the packet objects.
	 * strokeId -> canvasMessageId -> DrawingPoint[]
	 */
	private strokeInterpolatedPoints = new Map<
		string,
		Map<string, DrawingPoint[]>
	>();

	/** Packets waiting for their first send: actionId -> Set<canvasMessageId> */
	private pendingSendIndex = new Map<string, Set<string>>();

	/** Packets that failed and need to be retried: actionId -> Set<canvasMessageId> */
	private needsRetryIndex = new Map<string, Set<string>>();

	constructor(
		private readonly boundingBoxStore: BoundingBoxStore,
		private readonly erasureStore: ErasureStore,
	) {}

	// PACKET STORAGE - Create / Update
	/**
	 * Persist a new packet (or overwrite an existing one with the same IDs).
	 * Also registers the packet in the appropriate status index and, for drawing
	 * packets, triggers a bounding-box update.
	 */
	storePacket(packet: CanvasOperation) {
		// Drawing packets need a spatial index entry so the eraser can find them

		let packetMap = this.allPackets.get(packet.strokeId);
		if (!packetMap) {
			packetMap = new Map();
			this.allPackets.set(packet.strokeId, packetMap);
		}

		packetMap.set(packet.canvasMessageId, packet);

		// Register in the appropriate status index
		if (packet.status === MessageStatus.LOCAL) {
			return;
		}
		if (packet.status === MessageStatus.CREATED) {
			this.addToPendingSend(packet.strokeId, packet.canvasMessageId);
		} else if (packet.status === MessageStatus.FAILED) {
			this.addToNeedsRetry(packet.strokeId, packet.canvasMessageId);
		}
	}

	/**
	 * Transition a packet to a new status, keeping both indexes consistent.
	 * Returns false when the packet cannot be found.
	 */
	updatePacketStatus(
		actionId: string,
		canvasMessageId: string,
		status: MessageStatus,
	): boolean {
		const packet = this.allPackets.get(actionId)?.get(canvasMessageId);

		if (!packet) {
			console.warn(`CanvasOperation not found: ${actionId}/${canvasMessageId}`);
			return false;
		}

		// Remove from both indexes before re-adding to the correct one below
		this.needsRetryIndex.get(actionId)?.delete(canvasMessageId);
		this.pendingSendIndex.get(actionId)?.delete(canvasMessageId);

		const updatedPacket: CanvasOperation = {
			...packet,
			status,
			// Record the timestamp only when we start an attempt
			lastAttemptTimestamp:
				status === MessageStatus.SENDING
					? Date.now()
					: packet.lastAttemptTimestamp,
		};

		this.allPackets.get(actionId)!.set(canvasMessageId, updatedPacket);

		if (status === MessageStatus.FAILED) {
			this.addToNeedsRetry(actionId, canvasMessageId);
		} else if (status === MessageStatus.CREATED) {
			this.addToPendingSend(actionId, canvasMessageId);
		}

		return true;
	}

	// INTERPOLATED POINTS - Drawing Strokes Only
	/**
	 * Store interpolated points for a drawing packet.
	 * These are the densified points used for precise eraser collision detection,
	 * distinct from the raw points recorded in the packet itself.
	 */
	storeInterpolatedPoints(
		strokeId: string,
		canvasMessageId: string,
		points: DrawingPoint[],
	) {
		let interpolatedPointMap = this.strokeInterpolatedPoints.get(strokeId);
		if (!interpolatedPointMap) {
			interpolatedPointMap = new Map();
			this.strokeInterpolatedPoints.set(strokeId, interpolatedPointMap);
		}
		interpolatedPointMap.set(canvasMessageId, points);
	}

	/** Retrieve interpolated points for a specific packet, if stored. */
	getInterpolatedPoints(
		strokeId: string,
		canvasMessageId: string,
	): DrawingPoint[] | undefined {
		return this.strokeInterpolatedPoints.get(strokeId)?.get(canvasMessageId);
	}

	// PACKET RETRIEVAL - Direct Lookups
	getPacket(
		actionId: string,
		canvasMessageId: string,
	): CanvasOperation | undefined {
		return this.allPackets.get(actionId)?.get(canvasMessageId) as
			| CanvasOperation
			| undefined;
	}

	/**
	 * Look up the packet that immediately precedes the given one in the sequence.
	 * Returns undefined for the first packet in a stroke (sequence number 1).
	 */
	getPreviousPacket(packet: CanvasOperation): CanvasOperation | undefined {
		if (packet.packetSequenceNumber === 1) return undefined;

		const prevId = `${packet.strokeId}-${packet.packetSequenceNumber - 1}`;
		return this.getPacket(packet.strokeId, prevId);
	}

	/** Convenience helper: returns just the raw points for a packet. */
	getPacketPoints(
		actionId: string,
		canvasMessageId: string,
	): CanvasOperation['points'] | undefined {
		return this.allPackets.get(actionId)?.get(canvasMessageId)?.points;
	}

	/** All packets for one action, sorted by sequence number. */
	getAllForAction(actionId: string): CanvasOperation[] | undefined {
		const packetMap = this.allPackets.get(actionId);
		if (!packetMap) return undefined;

		return Array.from(packetMap.values()).sort(
			(a, b) => a.packetSequenceNumber - b.packetSequenceNumber,
		);
	}

	/** Iterate over every (actionId, packetMap) pair in the store. */
	getAllEntries() {
		return Array.from(this.allPackets.entries());
	}

	getAllStrokeIds() {
		return Array.from(this.allPackets.keys());
	}

	/** All action IDs currently in the store. */
	getAllActionIds(): string[] {
		return Array.from(this.allPackets.keys());
	}

	/**
	 * Returns every drawing packet that has not been erased, in no particular
	 * order.  Used when re-rendering the full canvas from scratch.
	 */
	getAllNonErasedDrawingPackets(): DrawingOperation[] {
		const result: DrawingOperation[] = [];

		for (const [actionId, actionMap] of this.allPackets.entries()) {
			if (this.erasureStore.isErased(actionId)) continue;

			for (const packet of actionMap.values()) {
				if (packet.type !== CanvasOperationType.DRAWING) continue;
				result.push(packet);
			}
		}

		return result;
	}

	/** All actions as arrays of packets (each array sorted by sequence number). */
	getAllActions(): CanvasOperation[][] {
		return this.getAllActionIds().map((id) => this.getAllForAction(id) ?? []);
	}

	// PACKET RETRIEVAL - Status-Based
	/** Packets for one action that are pending their first send, sorted by sequence. */
	getPendingForAction(actionId: string): CanvasOperation[] {
		const packetIds = this.pendingSendIndex.get(actionId);
		if (!packetIds || packetIds.size === 0) return [];

		const packetMap = this.allPackets.get(actionId);
		if (!packetMap) return [];

		const packets: CanvasOperation[] = [];
		packetIds.forEach((canvasMessageId) => {
			const packet = packetMap.get(canvasMessageId);
			if (packet) packets.push(packet);
		});

		return packets.sort(
			(a, b) => a.packetSequenceNumber - b.packetSequenceNumber,
		);
	}

	/** All pending packets across every action. */
	getAllPending(): CanvasOperation[] {
		const result: CanvasOperation[] = [];

		for (const actionId of this.pendingSendIndex.keys()) {
			const pendingPackets = this.pendingSendIndex.get(actionId);
			if (!pendingPackets) continue;

			for (const canvasMessageId of pendingPackets) {
				const packet = this.getPacket(actionId, canvasMessageId);
				if (packet) result.push(packet);
			}
		}

		return result;
	}

	/** All failed packets across every action (candidates for retry). */
	getAllNeedingRetry(): CanvasOperation[] {
		const result: CanvasOperation[] = [];

		for (const actionId of this.needsRetryIndex.keys()) {
			const needsRetryPackets = this.needsRetryIndex.get(actionId);
			if (!needsRetryPackets) continue;

			for (const canvasMessageId of needsRetryPackets) {
				const packet = this.getPacket(actionId, canvasMessageId);
				if (packet) result.push(packet);
			}
		}

		return result;
	}

	// QUERIES - Existence & Counts
	hasAction(actionId: string): boolean {
		return this.allPackets.has(actionId);
	}

	hasPacket(actionId: string, canvasMessageId: string): boolean {
		return this.allPackets.get(actionId)?.has(canvasMessageId) ?? false;
	}

	packetCount(actionId: string): number {
		return this.allPackets.get(actionId)?.size ?? 0;
	}

	hasPendingSends(actionId: string): boolean {
		return (this.pendingSendIndex.get(actionId)?.size ?? 0) > 0;
	}

	hasFailedPackets(actionId: string): boolean {
		return (this.needsRetryIndex.get(actionId)?.size ?? 0) > 0;
	}

	getStatusCounts(actionId: string) {
		return {
			pending: this.pendingSendIndex.get(actionId)?.size || 0,
			failed: this.needsRetryIndex.get(actionId)?.size || 0,
		};
	}

	// MONITORING
	getStats() {
		let total = 0;
		let created = 0;
		let sending = 0;
		let sent = 0;
		let acknowledged = 0;
		let failed = 0;
		let abandoned = 0;

		this.allPackets.forEach((packetMap) => {
			packetMap.forEach((packet) => {
				total++;
				switch (packet.status) {
					case MessageStatus.CREATED:
						created++;
						break;
					case MessageStatus.SENDING:
						sending++;
						break;
					case MessageStatus.SENT:
						sent++;
						break;
					case MessageStatus.ACKNOWLEDGED:
						acknowledged++;
						break;
					case MessageStatus.FAILED:
						failed++;
						break;
					case MessageStatus.ABANDONED:
						abandoned++;
						break;
				}
			});
		});

		return {
			total,
			created,
			sending,
			sent,
			acknowledged,
			failed,
			abandoned,
			actionsWithPending: this.pendingSendIndex.size,
			actionsWithFailed: this.needsRetryIndex.size,
		};
	}

	// CLEANUP
	/** Remove everything for one action from the packet store and both indexes. */
	deleteAction(actionId: string) {
		this.needsRetryIndex.delete(actionId);
		this.pendingSendIndex.delete(actionId);
		this.allPackets.delete(actionId);
		this.strokeInterpolatedPoints.delete(actionId);
	}

	clear() {
		this.allPackets.clear();
		this.needsRetryIndex.clear();
		this.pendingSendIndex.clear();
		this.strokeInterpolatedPoints.clear();
	}

	// PRIVATE HELPERS - Index Management
	private addToPendingSend(actionId: string, canvasMessageId: string) {
		if (!this.pendingSendIndex.has(actionId)) {
			this.pendingSendIndex.set(actionId, new Set());
		}
		this.pendingSendIndex.get(actionId)!.add(canvasMessageId);
	}

	private addToNeedsRetry(actionId: string, canvasMessageId: string) {
		if (!this.needsRetryIndex.has(actionId)) {
			this.needsRetryIndex.set(actionId, new Set());
		}
		this.needsRetryIndex.get(actionId)!.add(canvasMessageId);
	}
}
