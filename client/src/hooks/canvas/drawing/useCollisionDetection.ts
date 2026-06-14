import { useCallback } from 'react';
import { BoundingBox, DrawingPoint, EraserPoint } from '@/types';
import logger from '../../../util/logger';
import { canvasState } from 'src/util/canvas/CanvasState';

export const useCollisionDetection = () => {
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

	const createBoundingBox = useCallback(
		(points: EraserPoint[], eraserRadius: number): BoundingBox => {
			if (points.length === 0) {
				return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
			}

			let minX = points[0].x;
			let minY = points[0].y;
			let maxX = points[0].x;
			let maxY = points[0].y;

			for (const point of points) {
				minX = Math.min(minX, point.x);
				minY = Math.min(minY, point.y);
				maxX = Math.max(maxX, point.x);
				maxY = Math.max(maxY, point.y);
			}

			return {
				minX: minX - eraserRadius,
				minY: minY - eraserRadius,
				maxX: maxX + eraserRadius,
				maxY: maxY + eraserRadius,
			};
		},
		[],
	);

	const bboxesCollide = useCallback(
		(bbox1: BoundingBox, bbox2: BoundingBox): boolean => {
			return !(
				bbox1.maxX < bbox2.minX ||
				bbox1.minX > bbox2.maxX ||
				bbox1.maxY < bbox2.minY ||
				bbox1.minY > bbox2.maxY
			);
		},
		[],
	);

	const checkPointsCollision = useCallback(
		(
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
		},
		[distanceToLineSegment],
	);

	const isEraserPathCollidingWithPacket = useCallback(
		(
			eraserInterpolatedPoints: EraserPoint[],
			strokeId: string,
			canvasMessageId: string,
			strokePacketBBox: BoundingBox,
			eraserRadius: number,
		): boolean => {
			// 1. Create eraser bbox
			const eraserBBox = createBoundingBox(
				eraserInterpolatedPoints,
				eraserRadius,
			);

			logger.debug(
				'eraserBBox: ',
				eraserBBox,
				'created with:',
				eraserInterpolatedPoints,
			);

			// 2. Quick bbox collision check
			if (!bboxesCollide(eraserBBox, strokePacketBBox)) {
				logger.debug(
					`Bbox check failed for ${strokeId}/${canvasMessageId}`,
					'eraserBBox:',
					eraserBBox,
					'strokeBBox:',
					strokePacketBBox,
				);
				return false;
			}

			logger.debug(
				`Bbox collision detected for ${strokeId}/${canvasMessageId}, checking points...`,
			);

			// 3. Bbox collision detected! Now check interpolated stroke points
			const strokeInterpolatedPoints = canvasState.getStrokeInterpolatedPoints(
				strokeId,
				canvasMessageId,
			);

			// Check each eraser point against interpolated stroke points
			for (const eraserPoint of eraserInterpolatedPoints) {
				if (
					checkPointsCollision(
						eraserPoint,
						strokeInterpolatedPoints && strokeInterpolatedPoints.length > 0
							? strokeInterpolatedPoints
							: (canvasState.getPacket(strokeId, canvasMessageId)
									.points as DrawingPoint[]),
						eraserRadius,
					)
				) {
					logger.debug(
						`Point collision detected using interpolated points for ${strokeId}/${canvasMessageId}`,
					);
					return true;
				}
			}

			return false;
		},
		[createBoundingBox, bboxesCollide, checkPointsCollision],
	);

	return {
		isEraserPathCollidingWithPacket,
		distanceToLineSegment,
		createBoundingBox,
		bboxesCollide,
		checkPointsCollision,
	};
};
