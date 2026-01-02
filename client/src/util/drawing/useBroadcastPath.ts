// hooks/useBroadcastPath.ts
import { useCallback } from 'react';
import { Point } from '../../app/types_interfaces/DrawingTypes';
import logger from '../logger';
import { usePackageManager } from './usePackageManager';
import { useGapHandler } from './useGapHandler';

export const useBroadcastPath = (
	drawIncrementalPath: (
		contextPoints: Point[],
		toBeDrawnPoints: Point[]
	) => void,
	drawDotOnCanvas: (point: Point) => void
) => {
	const packageManager = usePackageManager();

	// Fetch missing packet from backend
	const fetchPacketFromBackend = useCallback(
		async (strokeId: string, sequence: number, maxRetries = 3) => {
			let delay = 0;
			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					console.log('test attempt: ', attempt);
					// todo hook the actual api
					const response = await fetch(
						`/api/strokes/${strokeId}/packets/${sequence}`,
						{
							method: 'GET',
							headers: { 'Content-Type': 'application/json' },
						}
					);

					if (response.ok) {
						return await response.json();
					}

					if (response.status === 404) {
						logger.warn('Packet not found in backend', { strokeId, sequence });
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
		[]
	);

	// Handle when gap is filled (packet arrives or fetched)
	const handleGapFilled = useCallback(
		(strokeId: string, sequence: number) => {
			const situation = packageManager.packageSituations.current.get(strokeId);
			if (!situation) return;

			logger.info('Gap filled', { strokeId, sequence });

			// Remove from missing
			situation.missingPackageIds.delete(sequence);

			// Try to drain sequential packets
			if (situation.expectedPackageSequenceNumber === sequence) {
				drainSequentialPackets(situation, strokeId);
			}

			packageManager.packageSituations.current.set(strokeId, situation);
		},
		[packageManager]
	);

	// Handle when gap becomes permanent
	const handleGapPermanent = useCallback(
		(strokeId: string, sequence: number) => {
			logger.warn('Gap declared permanent', { strokeId, sequence });

			packageManager.markGapAsPermanent(strokeId, sequence);

			// TODO: Decide what to do with permanent gaps
			// Option 1: Fill with linear interpolation
			// Option 2: Leave visible gap
			// Option 3: Show warning indicator

			// For now, just log it
			const situation = packageManager.packageSituations.current.get(strokeId);
			if (situation) {
				logger.warn('Stroke has permanent gaps', {
					strokeId,
					permanentGaps: Array.from(situation.permanentGaps),
				});
			}
		},
		[packageManager]
	);

	const gapHandler = useGapHandler({
		apiCallTimeout: 300,
		permanentTimeout: 1500,
		onGapFilled: handleGapFilled,
		onGapPermanent: handleGapPermanent,
		fetchPacketFromBackend,
	});

	const renderPoints = useCallback(
		(
			strokeId: string,
			packageId: string,
			packageSequenceNumber: number,
			isLastPackage: boolean
		): void => {
			const toBeDrawnPoints = packageManager.getPoints(strokeId, packageId);
			const oldPackageId = `${strokeId}-${packageSequenceNumber - 1}`;
			const latestPackagePoints =
				packageSequenceNumber !== 1
					? packageManager.getPoints(strokeId, oldPackageId)
					: [];

			if (toBeDrawnPoints.length === 0 && !isLastPackage) {
				logger.warn('Cannot render: points not found', { strokeId, packageId });
				return;
			}

			if (toBeDrawnPoints.length >= 2) {
				logger.debug('Rendering path', {
					strokeId,
					packageSequenceNumber,
					pointCount: toBeDrawnPoints.length,
				});
				drawIncrementalPath(latestPackagePoints, toBeDrawnPoints);
			} else if (toBeDrawnPoints.length === 1) {
				logger.debug('Rendering single point', { strokeId });
				drawDotOnCanvas(toBeDrawnPoints[0]);
			}
		},
		[packageManager, drawIncrementalPath, drawDotOnCanvas]
	);

	const drainSequentialPackets = useCallback(
		(situation: any, strokeId: string) => {
			let currentSeq = situation.lastRenderedSequence + 1;

			logger.debug('Draining sequential packets', {
				strokeId,
				startingFrom: currentSeq,
				receivedPackages: Array.from(situation.receivedPackageIds),
			});

			// Keep rendering while we have consecutive sequential packets
			while (situation.receivedPackageIds.has(currentSeq)) {
				const packageId = `${strokeId}-${currentSeq}`;
				const isLastPackage =
					currentSeq === situation.lastPackageSequenceNumber;

				renderPoints(strokeId, packageId, currentSeq, isLastPackage);

				situation.lastRenderedSequence = currentSeq;
				currentSeq++;
			}

			// Update expected to the next missing one
			situation.expectedPackageSequenceNumber = currentSeq;

			// Update hold rendering based on remaining gaps
			situation.holdRendering = situation.missingPackageIds.size > 0;

			logger.debug('Drain complete', {
				strokeId,
				lastRendered: situation.lastRenderedSequence,
				nextExpected: situation.expectedPackageSequenceNumber,
				stillHolding: situation.holdRendering,
			});
		},
		[renderPoints]
	);

	const drawBroadcastPath = useCallback(
		(
			points: Point[],
			isFirstPackage: boolean,
			isLastPackage: boolean,
			packageId: string,
			strokeId: string,
			packageSequenceNumber: number
		) => {
			try {
				logger.debug('Processing broadcast package', {
					strokeId,
					packageId,
					packageSequenceNumber,
					pointCount: points.length,
					isFirstPackage,
					isLastPackage,
				});

				// Store the points
				packageManager.storePoints(strokeId, packageId, points);

				// Update package tracking
				const situation = packageManager.updateSituation(
					strokeId,
					packageSequenceNumber,
					isFirstPackage,
					isLastPackage
				);

				// Check if out of order
				const isOutOfOrder =
					situation.expectedPackageSequenceNumber !== packageSequenceNumber;

				// Detect missing packages if out of order
				if (isOutOfOrder) {
					const previousMissing = new Set(situation.missingPackageIds);

					packageManager.detectMissingPackages(
						situation,
						packageSequenceNumber
					);

					// Update highest sequence - used as starting point for gap detection
					situation.highestPackageSequenceNumber = Math.max(
						packageSequenceNumber,
						situation.highestPackageSequenceNumber
					);

					// Start timers for newly detected gaps
					situation.missingPackageIds.forEach((seq) => {
						if (!previousMissing.has(seq)) {
							gapHandler.startGapTimeout(strokeId, seq);
						}
					});
				}

				// Check if this packet was missing
				const wasMissing = situation.missingPackageIds.has(
					packageSequenceNumber
				);

				// Remove from missing set now that we have it
				if (wasMissing) {
					situation.missingPackageIds.delete(packageSequenceNumber);
					gapHandler.cancelGapTimeout(strokeId, packageSequenceNumber);
					logger.info('Missing packet arrived', {
						strokeId,
						packageSequenceNumber,
					});
				}

				// Check if we can render
				const isExpectedPackage =
					situation.expectedPackageSequenceNumber === packageSequenceNumber;

				if (isExpectedPackage) {
					// Got the packet we were waiting for - drain sequential
					situation.holdRendering = false;
					drainSequentialPackets(situation, strokeId);
				} else {
					// Out of order and not what we're waiting for
					situation.holdRendering = true;
				}

				// Check completion
				const isComplete = packageManager.isStrokeComplete(situation);

				// Save updated situation
				packageManager.packageSituations.current.set(strokeId, situation);
			} catch (error) {
				logger.error('Failed to process broadcast package', error, {
					strokeId,
					packageId,
					packageSequenceNumber,
				});
			}
		},
		[packageManager, gapHandler, drainSequentialPackets]
	);

	const clearStroke = useCallback(
		(strokeId: string) => {
			gapHandler.clearAllGapsForStroke(strokeId);
			packageManager.clearStroke(strokeId);
		},
		[gapHandler, packageManager]
	);

	return {
		drawBroadcastPath,
		clearStroke,
	};
};
