import { useCallback } from 'react';
import { CanvasOperation, MessageStatus } from '@/types';
import logger from '../../../util/logger';
import { useReceivedPacketManager } from '../packets/useReceivedPacketManager';
import { useGapHandler } from './useGapHandler';
import { DrawIncrementalPathFn } from '../../canvas/drawing/useCanvasDrawing';
import { HandleGapFilledFn, HandleGapPermanentFn } from './gapHandler.types';
import { canvasState } from 'src/util/canvas/CanvasState';

export type DrawBroadcastPathFn = (packet: CanvasOperation) => void;

export const useBroadcastRenderer = (
	drawIncrementalPath: DrawIncrementalPathFn,
) => {
	const receivedPacketManager = useReceivedPacketManager();

	// Fetch missing packet from backend
	const fetchPacket = useCallback(
		async (strokeId: string, sequence: number, maxRetries = 3) => {
			let delay = 0;
			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					// todo hook the actual api
					const response = await fetch(
						`/api/strokes/${strokeId}/packets/${sequence}`,
						{
							method: 'GET',
							headers: { 'Content-Type': 'application/json' },
						},
					);

					if (response.ok) {
						return await response.json();
					}

					if (response.status === 404) {
						logger.warn('CanvasOperation not found in backend', {
							strokeId,
							sequence,
						});
						delay = attempt * 300;
						await new Promise((resolve) => setTimeout(resolve, delay));
						continue;
					}
					throw new Error(`Backend error: ${response.status}`, {
						cause: response,
					});
				} catch (error) {
					if (attempt === maxRetries) {
						logger.error('Failed to fetch packet after all retries', error);
						return null;
					}
					delay = attempt * 300;
					logger.warn(`Fetch error, retrying in ${delay}ms`, { error });
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		},
		[],
	);

	// Handle when gap is filled (packet arrives or fetched)
	const handleGapFilled: HandleGapFilledFn = useCallback(
		(packet: CanvasOperation, sequence: number) => {
			const strokeId = packet.strokeId;
			const situation =
				receivedPacketManager.packetSituations.current.get(strokeId);
			if (!situation) return;

			logger.info('Gap filled', { strokeId, sequence });

			// Remove from missing
			situation.missingPacketIds.delete(sequence);

			// Try to drain sequential packets
			if (situation.expectedPacketSequenceNumber === sequence) {
				drainSequentialPackets(situation, packet);
			}

			receivedPacketManager.packetSituations.current.set(strokeId, situation);
		},
		[receivedPacketManager],
	);

	// Handle when gap becomes permanent
	const handleGapPermanent: HandleGapPermanentFn = useCallback(
		(packet, sequence: number) => {
			const strokeId = packet.strokeId;
			logger.warn('Gap declared permanent', { strokeId, sequence });

			receivedPacketManager.markGapAsPermanent(strokeId, sequence);

			// TODO: Decide what to do with permanent gaps
			// Option 1: Fill with linear interpolation
			// Option 2: Leave visible gap
			// Option 3: Show warning indicator

			// For now, just log it
			const situation =
				receivedPacketManager.packetSituations.current.get(strokeId);
			if (situation) {
				logger.warn('Stroke has permanent gaps', {
					strokeId,
					permanentGaps: Array.from(situation.permanentGaps),
				});
			}
		},
		[receivedPacketManager],
	);

	const gapHandler = useGapHandler({
		apiCallTimeout: 300,
		permanentTimeout: 1500,
		handleGapFilled,
		handleGapPermanent,
		fetchPacket,
	});

	const drainSequentialPackets = useCallback(
		(situation: any, packet: CanvasOperation) => {
			let currentSeq = situation.lastRenderedSequence + 1;

			logger.debug('Draining sequential packets', {
				strokeId: packet.strokeId,
				startingFrom: currentSeq,
				receivedPacketIds: Array.from(situation.receivedPacketIds),
			});

			// Keep rendering while we have consecutive sequential packets
			while (situation.receivedPacketIds.has(currentSeq)) {
				const currentPacketId = `${packet.strokeId}-${currentSeq}`;
				const currentPacket = canvasState.getPacket(
					packet.strokeId,
					currentPacketId,
				);

				const previousPacket = canvasState.getPreviousPacket(currentPacket);
				const isFirstPacket = packet.packetSequenceNumber === 1;

				if (!previousPacket && !isFirstPacket) {
					logger.error('Expected previous packet but none found', {
						strokeId: packet.strokeId,
						packetSequenceNumber: packet.packetSequenceNumber,
					});
				} else {
					drawIncrementalPath(previousPacket, currentPacket);
				}
				situation.lastRenderedSequence = currentSeq;
				currentSeq++;
			}

			// Update expected to the next missing one
			situation.expectedPacketSequenceNumber = currentSeq;

			// Update hold rendering based on remaining gaps
			situation.holdRendering = situation.missingPacketIds.size > 0;

			logger.debug('Drain complete', {
				strokeId: packet.strokeId,
				lastRendered: situation.lastRenderedSequence,
				nextExpected: situation.expectedPacketSequenceNumber,
				stillHolding: situation.holdRendering,
			});
		},
		[],
	);

	const drawBroadcastPath: DrawBroadcastPathFn = useCallback(
		(packet: CanvasOperation) => {
			try {
				const {
					strokeId,
					canvasMessageId,
					packetSequenceNumber,
					points,
					isLastPacket,
					status,
				} = packet;

				const isFirstPacket = packetSequenceNumber === 1;
				logger.debug('Processing broadcast packet', {
					strokeId,
					canvasMessageId,
					packetSequenceNumber,
					points,
					isFirstPacket,
					isLastPacket,
				});

				canvasState.storePacket({
					...packet,
					status: MessageStatus.RECEIVED,
				});

				// Update packet tracking
				const situation = receivedPacketManager.updateSituation(
					strokeId,
					packetSequenceNumber,
					isLastPacket,
				);

				// Check if out of order
				const isOutOfOrder =
					situation.expectedPacketSequenceNumber !== packetSequenceNumber;

				// Detect missing packets if out of order
				if (isOutOfOrder) {
					const previousMissing = new Set(situation.missingPacketIds);

					receivedPacketManager.detectMissingPackets(
						situation,
						packetSequenceNumber,
					);

					// Update highest sequence - used as starting point for gap detection
					situation.highestPacketSequenceNumber = Math.max(
						packetSequenceNumber,
						situation.highestPacketSequenceNumber,
					);

					// Start timers for newly detected gaps
					situation.missingPacketIds.forEach((sequence) => {
						if (!previousMissing.has(sequence)) {
							gapHandler.startGapTimeout(packet, sequence);
						}
					});
				}

				// Check if this packet was missing
				const wasMissing = situation.missingPacketIds.has(packetSequenceNumber);

				// Remove from missing set now that we have it
				if (wasMissing) {
					situation.missingPacketIds.delete(packetSequenceNumber);
					gapHandler.cancelGapTimeout(strokeId, packetSequenceNumber);
					logger.info('Missing packet arrived', {
						strokeId,
						packetSequenceNumber,
					});
				}

				// Check if we can render
				const isExpectedPacket =
					situation.expectedPacketSequenceNumber === packetSequenceNumber;

				if (isExpectedPacket) {
					// Got the packet we were waiting for - drain sequential
					situation.holdRendering = false;
					drainSequentialPackets(situation, packet);
				} else {
					// Out of order and not what we're waiting for
					situation.holdRendering = true;
				}

				// Check completion
				const isComplete = receivedPacketManager.isStrokeComplete(situation);
				if (isComplete) {
					receivedPacketManager.clearSituationState(strokeId);
				}

				// Save updated situation
				receivedPacketManager.packetSituations.current.set(strokeId, situation);
			} catch (error) {
				logger.error('Failed to process broadcast packet', error, {
					strokeId: packet.strokeId,
					canvasMessageId: packet.canvasMessageId,
					packetSequenceNumber: packet.packetSequenceNumber,
				});
			}
		},
		[receivedPacketManager, gapHandler, drainSequentialPackets],
	);

	return {
		drawBroadcastPath,
	};
};
