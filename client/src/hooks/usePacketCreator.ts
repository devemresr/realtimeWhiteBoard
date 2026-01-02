import { useCallback, useRef } from 'react';
import { Point } from '../app/types_interfaces/DrawingTypes';

export interface PackageData {
	points: Point[];
	packageSequenceNumber: number;
	isLastPackage?: boolean;
}

interface PackageCreatorOptions {
	pointsPerPacket?: number;
}

export const usePackageCreator = (options: PackageCreatorOptions = {}) => {
	const POINTS_PER_PACKET = options.pointsPerPacket || 2;

	/**
	 * Creates packages from a buffer of points
	 * Returns array of packages ready to send
	 */
	const createPackagesFromBuffer = useCallback(
		(
			pointsBuffer: Point[],
			startingSequenceNumber: number
		): { packages: PackageData[]; remainingPoints: Point[] } => {
			const packages: PackageData[] = [];

			// Calculate how many complete packages we can make
			const completePackages = Math.floor(
				pointsBuffer.length / POINTS_PER_PACKET
			);

			// Create complete packages
			for (let i = 0; i < completePackages; i++) {
				const packagePoints = pointsBuffer.slice(
					i * POINTS_PER_PACKET,
					(i + 1) * POINTS_PER_PACKET
				);

				packages.push({
					points: packagePoints,
					packageSequenceNumber: startingSequenceNumber + i,
				});
			}

			// Calculate remaining points that didn't fill a complete package
			const remainingPoints = pointsBuffer.slice(
				completePackages * POINTS_PER_PACKET
			);

			return { packages, remainingPoints };
		},
		[POINTS_PER_PACKET]
	);

	/**
	 * Creates a final package from remaining points
	 */
	const createFinalPackage = useCallback(
		(points: Point[], sequenceNumber: number): PackageData => {
			return {
				points,
				packageSequenceNumber: sequenceNumber,
				isLastPackage: true,
			};
		},
		[]
	);

	return {
		createPackagesFromBuffer,
		createFinalPackage,
		POINTS_PER_PACKET,
	};
};
