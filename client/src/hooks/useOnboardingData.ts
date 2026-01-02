import { useCallback } from 'react';
import logger from '../util/logger';
import { StrokeData } from '../app/types_interfaces/DrawingTypes';

interface UseOnboardingDataOptions {
	drawBroadcastPath: (
		points: any[],
		isFirstPackage: boolean,
		isLastPackage: boolean,
		packageId: string,
		strokeId: string,
		packageSequenceNumber: number
	) => void;
	getOnboardingDataMutation: any; // todo add proper type
}

export const useOnboardingData = ({
	drawBroadcastPath,
	getOnboardingDataMutation,
}: UseOnboardingDataOptions) => {
	/**
	 * Deduplicates packages based on packageId
	 */
	const deduplicatePackages = useCallback(
		(
			allStrokes: StrokeData[][]
		): {
			deduped: StrokeData[][];
			duplicates: StrokeData[];
		} => {
			const seen = new Set<string>();
			const duplicates: StrokeData[] = [];

			const deduped = allStrokes.map((packages) =>
				packages.filter((pkg) => {
					if (seen.has(pkg.packageId)) {
						duplicates.push(pkg);
						logger.warn('Duplicate package detected', {
							packageId: pkg.packageId,
						});
						return false;
					}
					seen.add(pkg.packageId);
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
		(allStrokes: StrokeData[][]) => {
			const { deduped, duplicates } = deduplicatePackages(allStrokes);

			if (duplicates.length > 0) {
				logger.warn('Found duplicate packages during onboarding', {
					count: duplicates.length,
					duplicateIds: duplicates.map((d) => d.packageId),
				});
			}

			logger.info('Rendering onboarding data', {
				strokeCount: deduped.length,
				totalPackages: deduped.reduce((sum, stroke) => sum + stroke.length, 0),
			});

			// Render each stroke
			deduped.forEach((strokePackages, strokeIndex) => {
				logger.debug('Rendering stroke', {
					strokeIndex,
					packageCount: strokePackages.length,
				});

				// Render each package in the stroke
				strokePackages.forEach((pkg) => {
					const isFirstPackage = pkg.packageSequenceNumber === 1;
					const isLastPackage = pkg.isLastPackage ?? false;

					logger.debug('Rendering onboarding package', {
						packageId: pkg.packageId,
						strokeId: pkg.strokeId,
						sequenceNumber: pkg.packageSequenceNumber,
						pointCount: pkg.strokes?.length ?? 0,
						isFirstPackage,
						isLastPackage,
					});

					// Use the broadcast path - this ensures:
					// 1. Gap detection works
					// 2. Sequential rendering
					// 3. Same Catmull-Rom interpolation as live drawing
					drawBroadcastPath(
						pkg.strokes ?? [],
						isFirstPackage,
						isLastPackage,
						pkg.packageId,
						pkg.strokeId,
						pkg.packageSequenceNumber
					);
				});
			});

			logger.info('Onboarding data rendered successfully');
		},
		[drawBroadcastPath, deduplicatePackages]
	);

	/**
	 * Triggers the onboarding data fetch and renders it
	 */
	const loadOnboardingData = useCallback(
		(e?: React.MouseEvent): void => {
			e?.preventDefault();

			logger.info('Loading onboarding data');

			getOnboardingDataMutation.mutate(null, {
				onSuccess: (data: any) => {
					logger.debug('Onboarding data fetched', {
						dataStructure: data,
					});

					if (!data?.data) {
						logger.warn('No onboarding data found');
						return;
					}

					const allStrokes = data.data as StrokeData[][];
					renderOnboardingData(allStrokes);
				},
				onError: (error: any) => {
					logger.error('Failed to load onboarding data', error);
				},
			});
		},
		[getOnboardingDataMutation, renderOnboardingData]
	);

	return {
		loadOnboardingData,
		renderOnboardingData, // Expose for custom usage
		isLoading: getOnboardingDataMutation.isPending,
		isError: getOnboardingDataMutation.isError,
		error: getOnboardingDataMutation.error,
	};
};
