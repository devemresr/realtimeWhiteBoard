import logger from '../../../util/logger';
import { useCallback, useRef } from 'react';

interface PacketSituation {
	receivedPacketIds: Set<number>;
	expectedPacketSequenceNumber: number;
	highestPacketSequenceNumber: number;
	missingPacketIds: Set<number>;
	permanentGaps: Set<number>; // Track permanent gaps
	lastPacketSequenceNumber: number | null;
	lastRenderedSequence: number;
	holdRendering: boolean;
}

export const useReceivedPacketManager = () => {
	const packetSituations = useRef<Map<string, PacketSituation>>(new Map());

	const updateSituation = useCallback(
		(
			strokeId: string,
			packetSequenceNumber: number,
			isLastPacket: boolean
		): PacketSituation => {
			let situation = packetSituations.current.get(strokeId);

			if (!situation) {
				logger.info('Stroke started', { strokeId });
				situation = {
					receivedPacketIds: new Set<number>(),
					expectedPacketSequenceNumber: 1,
					missingPacketIds: new Set<number>(),
					permanentGaps: new Set<number>(),
					highestPacketSequenceNumber: 0,
					lastPacketSequenceNumber: isLastPacket ? packetSequenceNumber : null,
					holdRendering: false,
					lastRenderedSequence: 0,
				};
			}

			if (isLastPacket) {
				situation.lastPacketSequenceNumber = packetSequenceNumber;
			}

			situation.receivedPacketIds.add(packetSequenceNumber);

			return situation;
		},
		[]
	);

	const detectMissingPackets = useCallback(
		(situation: PacketSituation, packetSequenceNumber: number) => {
			logger.debug('Out-of-order packet detected', {
				expected: situation.expectedPacketSequenceNumber,
				received: packetSequenceNumber,
				highestPacketSequenceNumber: situation.highestPacketSequenceNumber,
			});

			// Scan from last highest sequence to current to find gaps
			for (
				let i = situation.highestPacketSequenceNumber + 1;
				i < packetSequenceNumber;
				i++
			) {
				if (!situation.receivedPacketIds.has(i)) {
					situation.missingPacketIds.add(i);
				}
			}

			logger.debug('Missing packets detected', {
				missing: Array.from(situation.missingPacketIds),
			});
		},
		[]
	);

	const markGapAsPermanent = useCallback(
		(strokeId: string, sequence: number): void => {
			const situation = packetSituations.current.get(strokeId);
			if (!situation) return;

			situation.permanentGaps.add(sequence);
			situation.missingPacketIds.delete(sequence);

			logger.warn('Gap marked as permanent', { strokeId, sequence });
		},
		[]
	);

	const isStrokeComplete = useCallback(
		(situation: PacketSituation): boolean => {
			if (situation.lastPacketSequenceNumber === null) {
				return false;
			}

			const isComplete =
				situation.receivedPacketIds.size === situation.lastPacketSequenceNumber;

			if (isComplete) {
				logger.debug('Stroke is completed', {
					totalPacket: situation.lastPacketSequenceNumber,
					receivedPackets: situation.receivedPacketIds.size,
				});
			}

			return isComplete;
		},
		[]
	);

	const clearSituationState = useCallback((strokeId: string) => {
		const situation = packetSituations.current.get(strokeId);

		if (!situation) {
			logger.warn('Cannot clear non-existent stroke', { strokeId });
			return;
		}

		logger.info('Cleared stroke situation', { strokeId });
		packetSituations.current.delete(strokeId);
	}, []);

	return {
		updateSituation,
		detectMissingPackets,
		markGapAsPermanent,
		isStrokeComplete,
		clearSituationState,
		packetSituations,
	};
};
