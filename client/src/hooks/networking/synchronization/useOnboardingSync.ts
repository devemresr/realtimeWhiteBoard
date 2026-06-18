import { useCallback } from 'react';
import logger from 'src/util/loggerTest';
import { HandleMessageFn } from '../socket/useSocketSubscription';
import {
	CanvasEvent,
	CanvasOperation,
	DrawingOperation,
	MessageCategory,
	MessageStatus,
} from '@/types';
type OnboardingData = {
	[MessageCategory.DRAWING]?: CanvasOperation[];
	[MessageCategory.EVENT]?: CanvasEvent[];
};
export const useOnboardingSync = (handleMessage: HandleMessageFn) => {
	const deduplicatePackets = useCallback(
		(allPackets: CanvasOperation[] = []) => {
			const seen = new Set<string>();
			const duplicates: CanvasOperation[] = [];

			const deduped = allPackets.filter((packet) => {
				if (seen.has(packet.canvasMessageId)) {
					duplicates.push(packet);
					return false;
				}

				seen.add(packet.canvasMessageId);
				return true;
			});

			return { deduped, duplicates };
		},
		[],
	);

	const renderOnboardingData = useCallback(
		(onboardingData: OnboardingData) => {
			const drawingData = onboardingData[MessageCategory.DRAWING] ?? [];
			const eventData = onboardingData[MessageCategory.EVENT] ?? [];

			const { deduped } = deduplicatePackets(drawingData);

			logger.debug({ deduped, eventData });

			deduped.forEach((packet) => {
				handleMessage({
					...packet,
					status: MessageStatus.RECEIVED,
				} as CanvasOperation);
			});
			eventData.forEach((canvasEvent) => {
				handleMessage({
					...canvasEvent,
					status: MessageStatus.RECEIVED,
				} as CanvasEvent);
			});
		},
		[deduplicatePackets, handleMessage],
	);
	return {
		renderOnboardingData,
	};
};
