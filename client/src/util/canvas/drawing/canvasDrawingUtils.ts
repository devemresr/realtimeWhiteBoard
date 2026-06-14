import { BasePoint, CanvasPoint } from '@/types';
import createInterpolator from './interpolation';

const interpolator = createInterpolator({ maxGap: 5 });

/**
 * Runs Catmull-Rom (or similar) interpolation across the combined
 * point sequence of two consecutive packets for smooth curves.
 */
export const getInterpolatedPoints = (
	contextPoints: BasePoint[],
	toBeDrawnPoints: BasePoint[],
): BasePoint[] => {
	return interpolator.interpolate([...contextPoints, ...toBeDrawnPoints]);
};

/**
 * Interpolated points come back as bare {x, y} BasePoints.
 * This re-attaches tool-specific properties (brushColor, brushSize, etc.)
 * from the first point of the current packet so downstream drawing
 * code doesn't need to know which tool produced the points.
 */
export const enrichInterpolatedPoints = <TPoint extends CanvasPoint>(
	interpolatedPoints: BasePoint[],
	pointToExtractProperties: TPoint,
): TPoint[] => {
	if (interpolatedPoints.length === 0) return [];

	// Strip positional fields — keep only tool-specific metadata
	const { x, y, timestamp, ...additionalProps } = pointToExtractProperties;

	return interpolatedPoints.map((point) => ({
		...point,
		...additionalProps,
	})) as TPoint[];
};
