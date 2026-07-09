import logger from 'src/util/logger';

// Tracks the state of an in-progress stroke as packets arrive over the network.
// Since packets can arrive out of order or not at all, we need to maintain
// enough state to detect gaps and know when a stroke is fully received.
export interface PacketSituation {
	receivedPacketIds: Set<number>;
	expectedPacketSequenceNumber: number;
	highestPacketSequenceNumber: number;
	missingPacketIds: Set<number>;
	permanentGaps: Set<number>; // Gaps that were never filled after all recovery attempts
	lastPacketSequenceNumber: number | null; // null until we receive the packet marked isLastPacket
	lastRenderedSequence: number;
	holdRendering: boolean;
}

export class ReceivedPacketManager {
	// One situation entry per active stroke, keyed by strokeId.
	// Cleared when the stroke completes or is abandoned.
	private packetSituations = new Map<string, PacketSituation>();

	// Creates a new situation for a stroke we haven't seen before,
	// or updates an existing one with the incoming packet.
	// Always call this first when a packet arrives.
	updateSituation(
		strokeId: string,
		packetSequenceNumber: number,
		isLastPacket: boolean,
	): PacketSituation {
		let situation = this.packetSituations.get(strokeId);

		if (!situation) {
			logger.info({ strokeId }, 'Stroke started');
			situation = {
				receivedPacketIds: new Set<number>(),
				expectedPacketSequenceNumber: 1,
				missingPacketIds: new Set<number>(),
				permanentGaps: new Set<number>(),
				highestPacketSequenceNumber: 0,
				// We may not know the total packet count until the last packet arrives
				lastPacketSequenceNumber: isLastPacket ? packetSequenceNumber : null,
				holdRendering: false,
				lastRenderedSequence: 0,
			};
		}

		// Once we know the final sequence number, record it for completion checks
		if (isLastPacket) {
			situation.lastPacketSequenceNumber = packetSequenceNumber;
		}

		this.packetSituations.set(strokeId, situation);
		situation.receivedPacketIds.add(packetSequenceNumber);

		return situation;
	}

	// Scans the range between the last known highest sequence and the current one,
	// adding any sequence numbers we haven't received yet to missingPacketIds.
	// Only called when a packet arrives out of order.
	// Note: highestPacketSequenceNumber must be updated by the caller after this runs.
	detectMissingPackets(
		situation: PacketSituation,
		packetSequenceNumber: number,
	): void {
		logger.debug(
			{
				expected: situation.expectedPacketSequenceNumber,
				received: packetSequenceNumber,
				highestPacketSequenceNumber: situation.highestPacketSequenceNumber,
			},
			'Out-of-order packet detected',
		);

		for (
			let i = situation.highestPacketSequenceNumber + 1;
			i < packetSequenceNumber;
			i++
		) {
			if (!situation.receivedPacketIds.has(i)) {
				situation.missingPacketIds.add(i);
			}
		}

		logger.debug(
			{
				missing: Array.from(situation.missingPacketIds),
			},
			'Missing packets detected',
		);
	}

	// Called when a gap has exceeded its recovery timeout and we've given up waiting.
	// The sequence is moved from missingPacketIds to permanentGaps so the
	// caller can decide how to handle it (interpolate, skip, show indicator, etc).
	markGapAsPermanent(strokeId: string, sequence: number): void {
		const situation = this.packetSituations.get(strokeId);
		if (!situation) return;

		situation.permanentGaps.add(sequence);
		situation.missingPacketIds.delete(sequence);

		logger.warn({ strokeId, sequence }, 'Gap marked as permanent');
	}

	// A stroke is only complete when we've received every packet from 1 to N.
	// We can't know N until the packet marked isLastPacket arrives, so this
	// returns false until that happens regardless of how many packets we have.
	isStrokeComplete(situation: PacketSituation): boolean {
		if (situation.lastPacketSequenceNumber === null) {
			return false;
		}

		const isComplete =
			situation.receivedPacketIds.size === situation.lastPacketSequenceNumber;

		if (isComplete) {
			logger.debug(
				{
					totalPacket: situation.lastPacketSequenceNumber,
					receivedPackets: situation.receivedPacketIds.size,
				},
				'Stroke is completed',
			);
		}

		return isComplete;
	}

	getSituation(strokeId: string): PacketSituation | undefined {
		return this.packetSituations.get(strokeId);
	}

	setSituation(strokeId: string, situation: PacketSituation): void {
		this.packetSituations.set(strokeId, situation);
	}

	// Removes all state for a stroke. Call this after a stroke completes
	// or is otherwise finished with the situation is no longer needed
	// and holding onto it would be a memory leak for long sessions.
	clearSituationState(strokeId: string): void {
		const situation = this.packetSituations.get(strokeId);

		if (!situation) {
			logger.warn({ strokeId }, 'Cannot clear non-existent stroke');
			return;
		}

		logger.info({ strokeId }, 'Cleared stroke situation');
		this.packetSituations.delete(strokeId);
	}
}
