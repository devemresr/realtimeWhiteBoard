import { useCallback, useEffect, useRef } from 'react';
import logger from 'src/util/logger';
import { CanvasOperation } from '@/types';
import { HandleGapFilledFn, HandleGapPermanentFn } from './gapHandler.types';

interface GapTimer {
	apiCallTimer: NodeJS.Timeout;
	permanentTimer: NodeJS.Timeout;
	gapSequence: number;
	strokeId: string;
}

interface GapHandlerConfig {
	apiCallTimeout: number; // 300ms - when to call backend
	permanentTimeout: number; // 1500ms - when to declare permanent
	fetchPacket: (strokeId: string, sequence: number) => Promise<any>;
}

interface GapCallbacks {
	handleGapFilled: HandleGapFilledFn;
	handleGapPermanent: HandleGapPermanentFn;
}

// Stays as a hook (rather than a class) because it owns setTimeout/clearTimeout
// lifecycle - cleanup on unmount is handled automatically via useEffect.
export const useGapHandler = ({
	apiCallTimeout,
	permanentTimeout,
	fetchPacket,
}: GapHandlerConfig) => {
	const activeGapTimers = useRef<Map<string, GapTimer>>(new Map());

	// Callbacks stored in a ref so timers always read the latest version
	// without needing them in dep arrays - avoids stale closure issues
	const callbacksRef = useRef<GapCallbacks>({
		handleGapFilled: null,
		handleGapPermanent: null,
	});

	// Called by the orchestrator after both callbacks are initialized.
	// Wires them in without causing startGapTimeout to recreate itself.
	const setCallbacks = useCallback((callbacks: GapCallbacks) => {
		callbacksRef.current = callbacks;
	}, []);

	// Clear all active timers on unmount to prevent stale callbacks
	// firing after the component is gone
	useEffect(() => {
		return () => {
			activeGapTimers.current.forEach((timer) => {
				clearTimeout(timer.apiCallTimer);
				clearTimeout(timer.permanentTimer);
			});
			activeGapTimers.current.clear();
		};
	}, []);

	const getGapKey = (strokeId: string, sequence: number) =>
		`${strokeId}:${sequence}`;

	const clearGapTimeout = useCallback((gapKey: string) => {
		const timers = activeGapTimers.current.get(gapKey);

		if (timers) {
			clearTimeout(timers.apiCallTimer);
			clearTimeout(timers.permanentTimer);
			activeGapTimers.current.delete(gapKey);
			logger.debug({ gapKey }, 'Cleared gap timers');
		}
	}, []);

	const startGapTimeout = useCallback(
		(packet: CanvasOperation, sequence: number) => {
			const strokeId = packet.strokeId;
			const gapKey = getGapKey(strokeId, sequence);

			// Already handling this gap - avoid double timers
			if (activeGapTimers.current.has(gapKey)) {
				logger.debug({ strokeId, sequence }, 'Gap already being tracked');
				return;
			}

			logger.info(
				{
					strokeId,
					sequence,
					apiCallTimeout,
					permanentTimeout,
				},
				'Starting gap timeout',
			);

			// Timer 1: Try to fetch the missing packet from the backend after 300ms.
			// If found, gap is filled and the permanent timer becomes irrelevant.
			// If not found, we wait for the permanent timer to fire instead.
			const apiCallTimer = setTimeout(async () => {
				logger.debug(
					`[${gapKey}] API call timeout reached, fetching from backend`,
				);

				try {
					const fetched = await fetchPacket(strokeId, sequence);

					if (fetched) {
						logger.info(`[${gapKey}] Successfully fetched missing packet`);
						clearGapTimeout(gapKey);
						callbacksRef.current.handleGapFilled?.(fetched, sequence);
					} else {
						logger.warn(`[${gapKey}] Packet not in backend yet`);
						// Will wait for permanent timeout
					}
				} catch (error) {
					logger.error({ error }, `[${gapKey}] API fetch failed`);
					// Will wait for permanent timeout
				}
			}, apiCallTimeout);

			// Timer 2: If the packet still hasn't arrived after 1500ms,
			// declare the gap permanent so the caller can decide how to handle it
			// (interpolate, skip, show indicator, etc.)
			const permanentTimer = setTimeout(() => {
				logger.warn(
					`[${gapKey}] Permanent timeout reached, declaring gap permanent`,
				);
				clearGapTimeout(gapKey);
				callbacksRef.current.handleGapPermanent?.(packet, sequence);
			}, permanentTimeout);

			activeGapTimers.current.set(gapKey, {
				apiCallTimer,
				permanentTimer,
				gapSequence: sequence,
				strokeId,
			});
		},
		// fetchPacket is stable (useCallback []). Callbacks read from ref, not deps.
		[apiCallTimeout, permanentTimeout, fetchPacket, clearGapTimeout],
	);

	const cancelGapTimeout = useCallback(
		(strokeId: string, sequence: number) => {
			const gapKey = getGapKey(strokeId, sequence);
			clearGapTimeout(gapKey);
		},
		[clearGapTimeout],
	);

	// Clears all active timers for a stroke - call this when a stroke
	// completes or is abandoned to avoid stale callbacks firing after cleanup
	const clearAllGapsForStroke = useCallback((strokeId: string) => {
		const keysToDelete: string[] = [];

		activeGapTimers.current.forEach((timer, gapKey) => {
			if (timer.strokeId === strokeId) {
				clearTimeout(timer.apiCallTimer);
				clearTimeout(timer.permanentTimer);
				keysToDelete.push(gapKey);
			}
		});

		keysToDelete.forEach((key) => activeGapTimers.current.delete(key));

		logger.debug(
			{
				strokeId,
				count: keysToDelete.length,
			},
			'Cleared all gap timers for stroke',
		);
	}, []);

	return {
		setCallbacks,
		startGapTimeout,
		cancelGapTimeout,
		clearAllGapsForStroke,
	};
};
