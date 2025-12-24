// hooks/usePackageManager.ts
import { Point } from '../../app/types_interfaces/DrawingTypes';
import logger from '../logger';
import { useCallback, useRef } from 'react';

interface PackageSituation {
	receivedPackageIds: Set<number>;
	expectedPackageSequenceNumber: number;
	highestPackageSequenceNumber: number;
	missingPackageIds: Set<number>;
	permanentGaps: Set<number>; // NEW: Track permanent gaps
	lastPackageSequenceNumber: number | null;
	lastRenderedSequence: number;
	holdRendering: boolean;
}

export const usePackageManager = () => {
	const packageSituations = useRef<Map<string, PackageSituation>>(new Map());
	const broadCastedPoints = useRef<Map<string, Map<string, Point[]>>>(
		new Map()
	);

	const updateSituation = useCallback(
		(
			strokeId: string,
			packageSequenceNumber: number,
			isFirstPackage: boolean,
			isLastPackage: boolean
		): PackageSituation => {
			let situation = packageSituations.current.get(strokeId);

			if (!situation) {
				logger.info('Stroke started', { strokeId });
				situation = {
					receivedPackageIds: new Set<number>(),
					expectedPackageSequenceNumber: 1,
					missingPackageIds: new Set<number>(),
					permanentGaps: new Set<number>(), // NEW
					highestPackageSequenceNumber: 0,
					lastPackageSequenceNumber: isLastPackage
						? packageSequenceNumber
						: null,
					holdRendering: false,
					lastRenderedSequence: 0,
				};
			}

			if (isLastPackage) {
				situation.lastPackageSequenceNumber = packageSequenceNumber;
			}

			situation.receivedPackageIds.add(packageSequenceNumber);

			return situation;
		},
		[]
	);

	const detectMissingPackages = useCallback(
		(situation: PackageSituation, packageSequenceNumber: number) => {
			logger.debug('Out-of-order package detected', {
				expected: situation.expectedPackageSequenceNumber,
				received: packageSequenceNumber,
				highestPackageSequenceNumber: situation.highestPackageSequenceNumber,
			});

			// Scan from last highest sequence to current to find gaps
			for (
				let i = situation.highestPackageSequenceNumber + 1;
				i < packageSequenceNumber;
				i++
			) {
				if (!situation.receivedPackageIds.has(i)) {
					situation.missingPackageIds.add(i);
				}
			}

			logger.debug('Missing packages detected', {
				missing: Array.from(situation.missingPackageIds),
			});
		},
		[]
	);

	const markGapAsPermanent = useCallback(
		(strokeId: string, sequence: number): void => {
			const situation = packageSituations.current.get(strokeId);
			if (!situation) return;

			situation.permanentGaps.add(sequence);
			situation.missingPackageIds.delete(sequence);

			logger.warn('Gap marked as permanent', { strokeId, sequence });
		},
		[]
	);

	const isStrokeComplete = useCallback(
		(situation: PackageSituation): boolean => {
			if (situation.lastPackageSequenceNumber === null) {
				return false;
			}

			const complete =
				situation.receivedPackageIds.size ===
				situation.lastPackageSequenceNumber;

			if (complete) {
				logger.debug('Stroke completed', {
					totalPackages: situation.lastPackageSequenceNumber,
					receivedPackages: situation.receivedPackageIds.size,
				});
			}

			return complete;
		},
		[]
	);

	const storePoints = useCallback(
		(strokeId: string, packageId: string, points: Point[]): void => {
			if (!broadCastedPoints.current.has(strokeId)) {
				logger.debug('Creating new stroke buffer', { strokeId });
				broadCastedPoints.current.set(strokeId, new Map());
			}

			broadCastedPoints.current.get(strokeId)!.set(packageId, points);

			logger.debug('Stored package points', {
				strokeId,
				packageId,
				pointCount: points.length,
			});
		},
		[]
	);

	const getPoints = useCallback(
		(strokeId: string, packageId: string): Point[] | undefined => {
			return broadCastedPoints.current.get(strokeId)?.get(packageId);
		},
		[]
	);

	const clearStroke = useCallback((strokeId: string) => {
		broadCastedPoints.current.delete(strokeId);
		packageSituations.current.delete(strokeId);
		logger.debug('Cleared stroke data', { strokeId });
	}, []);

	return {
		updateSituation,
		detectMissingPackages,
		markGapAsPermanent,
		isStrokeComplete,
		storePoints,
		getPoints,
		clearStroke,
		packageSituations,
		broadCastedPoints,
	};
};
