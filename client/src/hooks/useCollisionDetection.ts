import { useCallback } from 'react';
import { BoundingBox, DrawingPacket, DrawingPoint, EraserPoint } from '@/types';
import logger from '../util/logger';

export const useCollisionDetection = (getStrokeInterpolatedPoints) => {
	const distanceToLineSegment = useCallback(
		(p: EraserPoint, a: EraserPoint, b: EraserPoint): number => {
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const l2 = dx * dx + dy * dy;

			if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

			let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
			t = Math.max(0, Math.min(1, t));

			const projX = a.x + t * dx;
			const projY = a.y + t * dy;

			return Math.hypot(p.x - projX, p.y - projY);
		},
		[],
	);

	const isPointNearStroke = useCallback(
		(
			point: EraserPoint,
			stroke: DrawingPacket,
			strokeBoundingBox: BoundingBox,
			eraserRadius,
		): boolean => {
			// Quick bounding box check

			if (strokeBoundingBox) {
				const { minX, maxX, minY, maxY } = strokeBoundingBox;

				if (
					point.x < minX - eraserRadius ||
					point.x > maxX + eraserRadius ||
					point.y < minY - eraserRadius ||
					point.y > maxY + eraserRadius
				) {
					logger.debug(
						'@ the boundingbox check failed',
						'minX - eraserRadius',
						minX - eraserRadius,
						'maxX + eraserRadius',
						maxX + eraserRadius,
						'minY - eraserRadius',
						minY - eraserRadius,
						'maxY + eraserRadius',
						maxY + eraserRadius,
					);
					return false;
				}
			} else {
				logger.debug('@ couldnt find stores bounding box?');
			}

			// First pass: Check control points and find closest
			const isColliding = checkPointsCollision(
				point,
				stroke.points,
				eraserRadius,
			);
			if (isColliding) return isColliding;

			// const interpolatedPoints = getStrokeInterpolatedPoints(
			// 	closestPoint.closestStrokeId,
			// 	closestPoint.closestPacketId,
			// );

			// if (checkPointsCollision(point, interpolatedPoints, eraserRadius)) {
			// 	return true;
			// }
		},
		[distanceToLineSegment],
	);

	const checkPointsCollision = (
		eraserPoint: EraserPoint,
		points: DrawingPoint[],
		eraserRadius: number,
	): boolean => {
		if (!points || points.length === 0) return false;

		for (let i = 0; i < points.length; i++) {
			const p1 = points[i];
			const p2 = points[Math.min(i + 1, points.length - 1)];
			const strokeRadius = p1.brushSize / 2;
			const combinedRadius = eraserRadius + strokeRadius;

			const distance = distanceToLineSegment(eraserPoint, p1, p2);

			if (distance <= combinedRadius) {
				return true;
			}
		}

		return false;
	};

	return {
		isPointNearStroke,
		distanceToLineSegment,
	};
};
