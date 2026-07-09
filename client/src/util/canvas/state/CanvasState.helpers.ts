// canvasCoords.ts

import { BasePoint, CanvasPoint, DrawingPoint } from '@/types';
import logger from 'src/util/logger';

export function toRelative(value: number, dimension: number): number {
	return value / dimension;
}

export function toAbsolute(value: number, dimension: number): number {
	return value * dimension;
}

export function pointToRelative(
	point: BasePoint,
	canvasWidth: number,
	canvasHeight: number,
): BasePoint {
	logger.debug({ point, canvasHeight, canvasWidth }, 'inside pointtorelative');
	return {
		...point,
		x: toRelative(point.x, canvasWidth),
		y: toRelative(point.y, canvasHeight),
	};
}

export function pointToAbsolute(
	point: DrawingPoint,
	canvasWidth: number,
	canvasHeight: number,
): DrawingPoint {
	return {
		...point,
		x: toAbsolute(point.x, canvasWidth),
		y: toAbsolute(point.y, canvasHeight),
	};
}

export function pointsToRelative(
	points: CanvasPoint[],
	canvasWidth: number,
	canvasHeight: number,
): CanvasPoint[] {
	return points.map((p) => pointToRelative(p, canvasWidth, canvasHeight));
}

export function pointsToAbsolute(
	points: CanvasPoint[],
	canvasWidth: number,
	canvasHeight: number,
): CanvasPoint[] {
	return points.map((p) => pointToAbsolute(p, canvasWidth, canvasHeight));
}
