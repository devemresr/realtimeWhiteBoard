import { BoundingBox, DrawingPoint, EraserPoint } from '@/types';
import logger from '../../../util/logger';
import { canvasState } from 'src/util/canvas/state/CanvasState';

/**
 * Pure class encapsulating all collision detection logic used by the eraser tool.
 *
 * Responsibilities:
 *  - Compute point-to-line-segment distances
 *  - Build axis-aligned bounding boxes (AABBs) for eraser and stroke paths
 *  - Perform fast AABB vs AABB rejection tests
 *  - Fall back to precise per-point collision checks when AABBs overlap
 */
export class CollisionDetection {
	/**
	 * Returns the shortest distance from point `p` to the line segment `[a, b]`.
	 *
	 * When the segment has zero length (a === b) the distance degenerates to a
	 * simple point-to-point distance.
	 */
	distanceToLineSegment(
		p: EraserPoint,
		a: EraserPoint,
		b: EraserPoint,
	): number {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const l2 = dx * dx + dy * dy;

		// Degenerate segment - treat as a point
		if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

		// Project `p` onto the infinite line through a→b, clamped to [0, 1]
		let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
		t = Math.max(0, Math.min(1, t));

		const projX = a.x + t * dx;
		const projY = a.y + t * dy;

		return Math.hypot(p.x - projX, p.y - projY);
	}

	/**
	 * Builds the tightest AABB that contains all `points`, expanded outward by
	 * `eraserRadius` on every side so that proximity checks can use simple
	 * overlap tests.
	 *
	 * Returns a zero-area box at the origin when `points` is empty.
	 */
	createBoundingBox(points: EraserPoint[], eraserRadius: number): BoundingBox {
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
	}

	/**
	 * Returns `true` when two AABBs overlap on both axes (standard SAT check).
	 *
	 * Used as a cheap early-exit before the more expensive per-point tests.
	 */
	bboxesCollide(bbox1: BoundingBox, bbox2: BoundingBox): boolean {
		return !(
			bbox1.maxX < bbox2.minX ||
			bbox1.minX > bbox2.maxX ||
			bbox1.maxY < bbox2.minY ||
			bbox1.minY > bbox2.maxY
		);
	}

	/**
	 * Checks whether a single eraser point is close enough to any segment of a
	 * stroke's point list to count as a collision.
	 *
	 * Each stroke segment [p1, p2] contributes its own brush radius, so the
	 * effective collision threshold is `eraserRadius + strokeRadius`.
	 *
	 * Note: when `i` is the last index, p2 === p1 (clamped), so the last point
	 * is still tested as a degenerate segment.
	 */
	checkPointsCollision(
		eraserPoint: EraserPoint,
		points: DrawingPoint[],
		eraserRadius: number,
	): boolean {
		if (!points || points.length === 0) return false;

		for (let i = 0; i < points.length; i++) {
			const p1 = points[i];
			const p2 = points[Math.min(i + 1, points.length - 1)];
			const strokeRadius = p1.brushSize / 2;
			const combinedRadius = eraserRadius + strokeRadius;

			const distance = this.distanceToLineSegment(eraserPoint, p1, p2);

			if (distance <= combinedRadius) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Two-phase collision test between an eraser path and a single stroke packet.
	 *
	 * Phase 1 - AABB rejection:
	 *   Build a bounding box around the eraser path and compare it against the
	 *   pre-computed `strokePacketBBox`. If they don't overlap we can skip the
	 *   packet entirely.
	 *
	 * Phase 2 - Per-point precision check:
	 *   Fetch interpolated stroke points from `canvasState`. If none are cached,
	 *   fall back to the raw packet points. Then test every eraser point against
	 *   the stroke segments for a precise hit.
	 *
	 * @param eraserInterpolatedPoints - Dense eraser path points after interpolation
	 * @param strokeId                 - ID of the stroke being tested
	 * @param canvasMessageId          - Message ID the stroke belongs to
	 * @param strokePacketBBox         - Pre-computed AABB for the stroke packet
	 * @param eraserRadius             - Radius of the eraser tool in canvas units
	 * @returns `true` if the eraser overlaps the stroke packet
	 */
	isEraserPathCollidingWithPacket(
		eraserInterpolatedPoints: EraserPoint[],
		strokeId: string,
		canvasMessageId: string,
		strokePacketBBox: BoundingBox,
		eraserRadius: number,
	): boolean {
		// 1. Create eraser bbox
		const eraserBBox = this.createBoundingBox(
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
		if (!this.bboxesCollide(eraserBBox, strokePacketBBox)) {
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
				this.checkPointsCollision(
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
	}
}

/** Shared singleton - instantiate once and import wherever needed. */
export const collisionDetection = new CollisionDetection();
