import { useCallback } from 'react';
import logger from '../../../util/logger';
import {
	CanvasOperation,
	NetworkCanvasOperation,
	NetworkCanvasEvent,
	MessageStatus,
	CanvasOperationType,
	DrawingOperation,
	EraserOperation,
	LassoOperation,
	CanvasEvent,
	MessageCategory,
} from '@/types';
import { useGetOnboardingData } from '../../api/endpoints/useFormPosts';
import { HandleMessageFn } from '../socket/useSocketSubscription';

interface OnboardingData {
	[MessageCategory.DRAWING]: NetworkCanvasOperation[];
	[MessageCategory.EVENT]: NetworkCanvasEvent[];
}

export const useOnboardingSync = (
	getOnboardingDataQuery: ReturnType<typeof useGetOnboardingData>,
	handleMessage: HandleMessageFn,
) => {
	const deduplicatePackets = useCallback(
		(
			allPackets: NetworkCanvasOperation[],
		): {
			deduped: NetworkCanvasOperation[];
			duplicates: NetworkCanvasOperation[];
		} => {
			const seen = new Set<string>();
			const duplicates: NetworkCanvasOperation[] = [];

			const deduped = allPackets.filter((packet) => {
				if (seen.has(packet.canvasMessageId)) {
					duplicates.push(packet);
					logger.warn('Duplicate packet detected', {
						canvasMessageId: packet.canvasMessageId,
						strokeId: packet.strokeId,
						packetSequenceNumber: packet.packetSequenceNumber,
					});
					return false;
				}
				seen.add(packet.canvasMessageId);
				return true;
			});

			logger.debug('Dedup summary', {
				totalPacketsIn: allPackets.length,
				totalPacketsOut: deduped.length,
				totalDuplicates: duplicates.length,
				duplicatePacketIds: duplicates.map((p) => p.canvasMessageId),
			});

			return { deduped, duplicates };
		},
		[],
	);

	const renderOnboardingData = useCallback(
		({
			drawing: drawingData,
			event: eventData,
		}: {
			drawing: NetworkCanvasOperation[];
			event: NetworkCanvasEvent[];
		}) => {
			const { deduped, duplicates } = deduplicatePackets(drawingData);

			if (duplicates.length > 0) {
				logger.warn('Duplicate packets found during onboarding', {
					count: duplicates.length,
					duplicateIds: duplicates.map((d) => d.canvasMessageId),
				});
			}

			logger.info('Rendering onboarding data', {
				strokeCount: deduped.length,
				totalPackets: deduped.length,
				eventCount: eventData.length,
			});

			deduped.forEach((packet) => {
				let fullPacket: CanvasOperation;

				switch (packet.type) {
					case CanvasOperationType.DRAWING:
						fullPacket = {
							...packet,
							status: MessageStatus.RECEIVED,
						} as DrawingOperation;
						break;
					case CanvasOperationType.ERASER:
						fullPacket = {
							...packet,
							status: MessageStatus.RECEIVED,
						} as EraserOperation;
						break;
					case CanvasOperationType.LASSO:
						fullPacket = {
							...packet,
							status: MessageStatus.RECEIVED,
						} as LassoOperation;
						break;
				}

				eventData.forEach((canvasEvent) => {
					handleMessage({
						...canvasEvent,
						status: MessageStatus.RECEIVED,
					} as CanvasEvent);
				});

				handleMessage(fullPacket);
			});

			logger.info('Onboarding data rendered successfully', {
				packetsRendered: deduped.length,
				eventsRendered: eventData.length,
			});
		},
		[deduplicatePackets, handleMessage],
	);

	const loadOnboardingData = useCallback(
		async (e?: React.MouseEvent): Promise<void> => {
			e?.preventDefault();
			logger.info('Loading onboarding data');

			const { data } = await getOnboardingDataQuery.refetch();
			// controller returns { drawingData, eventData } — map to OnboardingData shape for renderOnboardingData
			const { drawingData, eventData } =
				(data as {
					drawingData?: NetworkCanvasOperation[];
					eventData?: NetworkCanvasEvent[];
				}) ?? {};
			logger.debug('onboardingData', { drawingData, eventData });

			if (!data) {
				logger.warn('No onboarding data found or invalid format');
				return;
			}
			if (!drawingData || !eventData) {
				logger.warn('Onboarding data missing expected fields', {
					hasDrawing: !!drawingData,
					hasEvents: !!eventData,
				});
			}

			// if the controller returned data, trust it has the right shape —
			// empty arrays are valid (room with no strokes yet)
			renderOnboardingData({
				[MessageCategory.DRAWING]: drawingData ?? [],
				[MessageCategory.EVENT]: eventData ?? [],
			});
		},
		[getOnboardingDataQuery, renderOnboardingData],
	);

	return {
		loadOnboardingData,
		renderOnboardingData,
		isLoading: getOnboardingDataQuery.isFetching,
		isError: getOnboardingDataQuery.isError,
		error: getOnboardingDataQuery.error,
	};
};
