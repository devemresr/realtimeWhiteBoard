import { CanvasOperation, MessageStatus } from '@/types';
import {
	ReceivedPacketManager,
	PacketSituation,
} from '../packets/ReceivedPacketManager';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import { DrawIncrementalPathFn } from '../../canvas/drawing/useCanvasDrawing';
import { HandleGapFilledFn, HandleGapPermanentFn } from './gapHandler.types';
import { pointsToAbsolute } from 'src/util/canvas/state/CanvasState.helpers';
import logger from 'src/util/logger';

export type DrawBroadcastPathFn = (packet: CanvasOperation) => void;

// Owns the broadcast rendering pipeline - receives packets over the network,
// tracks their order and gaps, and draws them to the canvas once sequential.
// Designed to be held in a useRef by the orchestrator hook.
export class BroadcastRenderer {
	private packetManager: ReceivedPacketManager;

	// Wrapped in a ref by the orchestrator so we always call the latest
	// version even if brushOptions change and recreate drawIncrementalPath
	private drawIncrementalPathRef: React.RefObject<DrawIncrementalPathFn>;

	constructor(
		packetManager: ReceivedPacketManager,
		drawIncrementalPathRef: React.RefObject<DrawIncrementalPathFn>,
	) {
		this.packetManager = packetManager;
		this.drawIncrementalPathRef = drawIncrementalPathRef;
	}

	// Fetch a missing packet from the backend with exponential backoff.
	// Returns null after all retries are exhausted - caller decides how to handle.
	async fetchPacket(
		strokeId: string,
		sequence: number,
		maxRetries = 3,
	): Promise<any> {
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
					logger.warn(
						{
							strokeId,
							sequence,
						},
						'CanvasOperation not found in backend',
					);
					delay = attempt * 300;
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}

				throw new Error(`Backend error: ${response.status}`, {
					cause: response,
				});
			} catch (error) {
				if (attempt === maxRetries) {
					logger.error({ error }, 'Failed to fetch packet after all retries');
					return null;
				}
				delay = attempt * 300;
				logger.warn({ error }, `Fetch error, retrying in ${delay}ms`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	// Called when a gap is filled - either the missing packet arrived over the
	// network or was fetched from the backend. Removes it from missing and
	// attempts to drain any now-unblocked sequential packets.
	handleGapFilled: HandleGapFilledFn = (
		packet: CanvasOperation,
		sequence: number,
	) => {
		const strokeId = packet.strokeId;
		const situation = this.packetManager.getSituation(strokeId);
		if (!situation) return;

		logger.info({ strokeId, sequence }, 'Gap filled');

		situation.missingPacketIds.delete(sequence);

		// Only drain if this was the packet we were waiting for next
		if (situation.expectedPacketSequenceNumber === sequence) {
			this.drainSequentialPackets(situation, packet);
		}

		this.packetManager.setSituation(strokeId, situation);
	};

	// Called when a gap has exceeded the permanent timeout and recovery failed.
	// The gap is recorded for potential interpolation or visual indication later.
	handleGapPermanent: HandleGapPermanentFn = (
		packet: CanvasOperation,
		sequence: number,
	) => {
		const strokeId = packet.strokeId;
		logger.warn({ strokeId, sequence }, 'Gap declared permanent');

		this.packetManager.markGapAsPermanent(strokeId, sequence);

		// TODO: Decide what to do with permanent gaps
		// Option 1: Fill with linear interpolation
		// Option 2: Leave visible gap
		// Option 3: Show warning indicator

		// For now, just log it
		const situation = this.packetManager.getSituation(strokeId);
		if (situation) {
			logger.warn(
				{
					strokeId,
					permanentGaps: Array.from(situation.permanentGaps),
				},
				'Stroke has permanent gaps',
			);
		}
	};

	// Renders consecutive packets in sequence order starting from the last rendered one.
	// Stops as soon as there's a gap - holdRendering will keep it paused until
	// the missing packet arrives or is declared permanent.
	private drainSequentialPackets(
		situation: PacketSituation,
		packet: CanvasOperation,
	): void {
		let currentSeq = situation.lastRenderedSequence + 1;

		logger.debug(
			{
				strokeId: packet.strokeId,
				startingFrom: currentSeq,
				receivedPacketIds: Array.from(situation.receivedPacketIds),
			},
			'Draining sequential packets',
		);

		while (situation.receivedPacketIds.has(currentSeq)) {
			const currentPacketId = `${packet.strokeId}-${currentSeq}`;
			const currentPacket = canvasState.getPacket(
				packet.strokeId,
				currentPacketId,
			);

			if (!currentPacket) {
				logger.error(
					{
						strokeId: packet.strokeId,
						currentSeq,
						currentPacketId,
					},
					'Packet in receivedPacketIds but not in canvasState',
				);
				break;
			}

			const isFirstPacket = currentSeq === 1; // fix: use currentSeq, not outer packet
			const previousPacket = isFirstPacket
				? null
				: canvasState.getPreviousPacket(currentPacket);

			if (!previousPacket && !isFirstPacket) {
				logger.error(
					{
						strokeId: packet.strokeId,
						currentSeq,
					},
					'Expected previous packet but none found',
				);
				break; //  don't silently skip, stop draining
			}

			this.drawIncrementalPathRef.current?.(previousPacket, currentPacket);

			situation.lastRenderedSequence = currentSeq;
			currentSeq++;
		}

		situation.expectedPacketSequenceNumber = currentSeq;
		situation.holdRendering = situation.missingPacketIds.size > 0;

		logger.debug(
			{
				strokeId: packet.strokeId,
				lastRendered: situation.lastRenderedSequence,
				nextExpected: situation.expectedPacketSequenceNumber,
				stillHolding: situation.holdRendering,
			},
			'Drain complete',
		);
	}

	// Main entry point for broadcast packets. Handles out-of-order arrival,
	// gap detection, rendering, and stroke completion in one pipeline.
	drawBroadcastPath: DrawBroadcastPathFn = (packet: CanvasOperation) => {
		try {
			const {
				strokeId,
				canvasMessageId,
				packetSequenceNumber,
				points,
				isLastPacket,
			} = packet;

			const isFirstPacket = packetSequenceNumber === 1;
			logger.debug(
				{
					strokeId,
					canvasMessageId,
					packetSequenceNumber,
					points,
					isFirstPacket,
					isLastPacket,
				},
				'Processing broadcast packet',
			);

			// Broadcast packets arrive in relative (0-1) coordinate space.
			// storePacket's contract expects absolute pixel coordinates
			// (it converts to relative internally for storage), so convert here.
			const absolutePacket = {
				...packet,
				points: pointsToAbsolute(
					packet.points,
					canvasState.canvasWidth,
					canvasState.canvasHeight,
				),
			};

			canvasState.storePacket({
				...absolutePacket,
				status: MessageStatus.RECEIVED,
			});

			// Update packet tracking - creates situation if this is the first
			// packet for this stroke, otherwise updates the existing one
			const situation = this.packetManager.updateSituation(
				strokeId,
				packetSequenceNumber,
				isLastPacket,
			);

			const isOutOfOrder =
				situation.expectedPacketSequenceNumber !== packetSequenceNumber;

			if (isOutOfOrder) {
				const previousMissing = new Set(situation.missingPacketIds);

				this.packetManager.detectMissingPackets(
					situation,
					packetSequenceNumber,
				);

				// Update highest sequence - used as the starting point for gap detection
				situation.highestPacketSequenceNumber = Math.max(
					packetSequenceNumber,
					situation.highestPacketSequenceNumber,
				);

				// Start timers only for gaps we haven't seen before -
				// exposed via onNewGap so the orchestrator can wire in useGapHandler
				situation.missingPacketIds.forEach((sequence) => {
					if (!previousMissing.has(sequence)) {
						this.onNewGap?.(packet, sequence);
					}
				});
			}

			// If this packet was previously flagged as missing, it arrived late -
			// cancel the recovery timer and remove it from the missing set
			const wasMissing = situation.missingPacketIds.has(packetSequenceNumber);
			if (wasMissing) {
				situation.missingPacketIds.delete(packetSequenceNumber);
				this.onGapResolved?.(strokeId, packetSequenceNumber);
				logger.info(
					{
						strokeId,
						packetSequenceNumber,
					},
					'Missing packet arrived late',
				);
			}

			const isExpectedPacket =
				situation.expectedPacketSequenceNumber === packetSequenceNumber;

			if (isExpectedPacket) {
				// Got the packet we were waiting for - release hold and drain
				situation.holdRendering = false;
				this.drainSequentialPackets(situation, packet);
			} else {
				// Out of order and not what we're waiting for - hold until gap fills
				situation.holdRendering = true;
			}

			// Stroke is only complete once we've received every packet up to isLastPacket
			const isComplete = this.packetManager.isStrokeComplete(situation);
			if (isComplete) {
				this.packetManager.clearSituationState(strokeId);
			}

			this.packetManager.setSituation(strokeId, situation);
		} catch (error) {
			logger.error(
				{
					error,
					strokeId: packet.strokeId,
					canvasMessageId: packet.canvasMessageId,
					packetSequenceNumber: packet.packetSequenceNumber,
				},
				'Failed to process broadcast packet',
			);
		}
	};

	// Wired in by the orchestrator to bridge gap detection to useGapHandler
	onNewGap?: (packet: CanvasOperation, sequence: number) => void;
	onGapResolved?: (strokeId: string, sequence: number) => void;
}
