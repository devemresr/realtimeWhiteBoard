// hooks/useGapHandler.ts
import { useCallback, useRef } from 'react';
import logger from '../logger';

interface GapTimer {
	apiCallTimer: NodeJS.Timeout;
	permanentTimer: NodeJS.Timeout;
	gapSequence: number;
	strokeId: string;
}

interface GapHandlerConfig {
	apiCallTimeout: number; // 300ms - when to call backend
	permanentTimeout: number; // 1500ms - when to declare permanent
	onGapFilled: (strokeId: string, sequence: number) => void;
	onGapPermanent: (strokeId: string, sequence: number) => void;
	fetchPacketFromBackend: (strokeId: string, sequence: number) => Promise<any>;
}

export const useGapHandler = (config: GapHandlerConfig) => {
	const activeGapTimers = useRef<Map<string, GapTimer>>(new Map());

	const getGapKey = (strokeId: string, sequence: number) =>
		`${strokeId}:${sequence}`;

	const startGapTimeout = useCallback(
		(strokeId: string, sequence: number) => {
			const gapKey = getGapKey(strokeId, sequence);

			// Already handling this gap?
			if (activeGapTimers.current.has(gapKey)) {
				logger.debug('Gap already being tracked', { strokeId, sequence });
				return;
			}

			logger.info('Starting gap timeout', {
				strokeId,
				sequence,
				apiCallTimeout: config.apiCallTimeout,
				permanentTimeout: config.permanentTimeout,
			});

			// Timer 1: API call after 300ms
			const apiCallTimer = setTimeout(async () => {
				logger.debug(
					`[${gapKey}] API call timeout reached, fetching from backend`
				);

				try {
					const packet = await config.fetchPacketFromBackend(
						strokeId,
						sequence
					);

					if (packet) {
						logger.info(`[${gapKey}] Successfully fetched missing packet`);
						clearGapTimeout(gapKey);
						config.onGapFilled(strokeId, sequence);
					} else {
						logger.warn(`[${gapKey}] Packet not in backend yet`);
						// Will wait for permanent timeout
					}
				} catch (error) {
					logger.error(`[${gapKey}] API fetch failed`, error);
					// Will wait for permanent timeout
				}
			}, config.apiCallTimeout);

			// Timer 2: Declare permanent after 1500ms
			const permanentTimer = setTimeout(() => {
				logger.warn(
					`[${gapKey}] Permanent timeout reached, declaring gap permanent`
				);

				clearGapTimeout(gapKey);
				config.onGapPermanent(strokeId, sequence);
			}, config.permanentTimeout);

			activeGapTimers.current.set(gapKey, {
				apiCallTimer,
				permanentTimer,
				gapSequence: sequence,
				strokeId,
			});
		},
		[config]
	);

	const clearGapTimeout = useCallback((gapKey: string) => {
		const timers = activeGapTimers.current.get(gapKey);

		if (timers) {
			clearTimeout(timers.apiCallTimer);
			clearTimeout(timers.permanentTimer);
			activeGapTimers.current.delete(gapKey);

			logger.debug('Cleared gap timers', { gapKey });
		}
	}, []);

	const cancelGapTimeout = useCallback(
		(strokeId: string, sequence: number) => {
			const gapKey = getGapKey(strokeId, sequence);
			clearGapTimeout(gapKey);
		},
		[clearGapTimeout]
	);

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

		logger.debug('Cleared all gap timers for stroke', {
			strokeId,
			count: keysToDelete.length,
		});
	}, []);

	return {
		startGapTimeout,
		cancelGapTimeout,
		clearAllGapsForStroke,
	};
};
