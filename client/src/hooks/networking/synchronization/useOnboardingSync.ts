import { useCallback } from 'react';
import logger from '../../../util/logger';
import { StrokePacket } from '@/types';
import { DrawBroadcastPathFn } from './useBroadcastPath';
import { useGetOnboardingData } from '../../api/endpoints/useFormPosts';

export const useOnboardingSync = (
	drawBroadcastPath: DrawBroadcastPathFn,
	getOnboardingDataQuery: ReturnType<typeof useGetOnboardingData>
) => {
	/**
	 * Deduplicates packets based on packetId
	 */
	const deduplicatePackets = useCallback(
		(
			allStrokes: StrokePacket[][]
		): {
			deduped: StrokePacket[][];
			duplicates: StrokePacket[];
		} => {
			const seen = new Set<string>();
			const duplicates: StrokePacket[] = [];

			const deduped = allStrokes.map((packets) =>
				packets.filter((pkg) => {
					if (seen.has(pkg.packetId)) {
						duplicates.push(pkg);
						logger.warn('Duplicate packet detected', {
							packetId: pkg.packetId,
						});
						return false;
					}
					seen.add(pkg.packetId);
					return true;
				})
			);

			return { deduped, duplicates };
		},
		[]
	);

	/**
	 * Renders onboarding data using the broadcast path (gap detection, sequencing, etc.)
	 */
	const renderOnboardingData = useCallback(
		(allStrokePackets: StrokePacket[][]) => {
			const { deduped, duplicates } = deduplicatePackets(allStrokePackets);

			if (duplicates.length > 0) {
				logger.warn('Found duplicate packets during onboarding', {
					count: duplicates.length,
					duplicateIds: duplicates.map((d) => d.packetId),
				});
			}

			logger.info('Rendering onboarding data', {
				strokeCount: deduped.length,
				totalPackets: deduped.reduce((sum, stroke) => sum + stroke.length, 0),
			});

			// Render each stroke
			deduped.forEach((strokePacket, strokeIndex) => {
				logger.debug('Rendering stroke', {
					strokeIndex,
					packetCount: strokePacket.length,
				});

				// Render each packet in the stroke
				strokePacket.forEach((pkg) => {
					const isLastPacket = pkg.isLastPacket ?? false;
					const {
						packetId,
						strokeId,
						packetSequenceNumber,
						strokeSequenceNumber,
						roomId,
						authorId,
						points = [],
					} = pkg;

					logger.debug('Rendering onboarding packet', {
						packetId: pkg.packetId,
						strokeId: pkg.strokeId,
						sequenceNumber: pkg.packetSequenceNumber,
						pointCount: pkg.points?.length ?? 0,
						isLastPacket,
					});

					// Use the broadcast path - this ensures:
					// 1. Gap detection works
					// 2. Sequential rendering
					// 3. Same Catmull-Rom interpolation as live drawing
					const packet = {
						points,
						strokeSequenceNumber,
						roomId,
						authorId,
						isLastPacket,
						packetId,
						strokeId,
						packetSequenceNumber,
					};
					drawBroadcastPath(packet);
				});
			});

			logger.info('Onboarding data rendered successfully');
		},
		[drawBroadcastPath, deduplicatePackets]
	);

	/**
	 * Triggers the onboarding data fetch and renders it
	 */
	const loadOnboardingData = useCallback(
		async (e?: React.MouseEvent): Promise<void> => {
			e?.preventDefault();
			logger.info('Loading onboarding data');

			const { data } = await getOnboardingDataQuery.refetch();

			const allStrokes = (data as { data?: unknown })?.data ?? null;

			if (!allStrokes || !Array.isArray(allStrokes)) {
				logger.warn('No onboarding data found or invalid format');
				return;
			}

			logger.debug('Onboarding data fetched', {
				dataStructure: data,
			});

			renderOnboardingData(allStrokes);
		},
		[getOnboardingDataQuery, renderOnboardingData]
	);

	return {
		loadOnboardingData,
		renderOnboardingData, // Expose for custom usage
		isLoading: getOnboardingDataQuery.isFetching,
		isError: getOnboardingDataQuery.isError,
		error: getOnboardingDataQuery.error,
	};
};
