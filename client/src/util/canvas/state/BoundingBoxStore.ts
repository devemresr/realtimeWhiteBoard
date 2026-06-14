import { BoundingBox, DrawingPoint } from '@/types';
import logger from 'src/util/logger';
import { SpatialGrid } from './SpatialGrid';

/**
 * BoundingBoxStore
 *
 * Maintains a single axis-aligned bounding box (AABB) per stroke and keeps
 * the spatial grid in sync whenever that box is updated.
 *
 * Design notes
 * ------------
 * - One bbox per stroke, not one per packet.  When new packets arrive for an
 *   existing stroke, the stored bbox is *expanded* to encompass the new points
 *   rather than replaced.  This matches how strokes grow incrementally.
 * - Brush size is factored into the bbox so that thick strokes don't produce
 *   false misses during eraser hit-testing.
 * - Out-of-canvas-bounds points are logged as warnings but are still included
 *   in the bbox (clamped to 0 on the min side only) so nothing is silently lost.
 */
export class BoundingBoxStore {
	/** strokeId -> BoundingBox (single AABB encompassing all packets of that stroke) */
	private boxes = new Map<string, BoundingBox>();

	constructor(
		private readonly canvasWidth: number,
		private readonly canvasHeight: number,
		private readonly spatialGrid: SpatialGrid,
	) {}

	// UPDATE
	/**
	 * Compute a bounding box for `newPoints`, merge it with any existing bbox
	 * for `strokeId`, persist the result, and sync the spatial grid.
	 *
	 * Called every time a new drawing packet arrives for a stroke.
	 */
	update(strokeId: string, canvasMessageId: string, newPoints: DrawingPoint[]) {
		if (Object.keys(newPoints).length === 0) return;

		// ---- compute a fresh bbox from the incoming points ----
		let maxBrushSize = newPoints[0].brushSize || 0;
		const halfBrush = maxBrushSize / 2;

		// Seed min/max from the first point (accounting for brush radius)
		let minX = newPoints[0].x - halfBrush;
		let minY = newPoints[0].y - halfBrush;
		let maxX = newPoints[0].x + halfBrush;
		let maxY = newPoints[0].y + halfBrush;

		for (const point of newPoints) {
			if (
				point.x < 0 ||
				point.x > this.canvasWidth ||
				point.y < 0 ||
				point.y > this.canvasHeight
			) {
				logger.warn('Point outside canvas bounds:', point);
			}
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			maxBrushSize = Math.max(maxBrushSize, point.brushSize || 0);
		}

		// ---- expand with existing bbox if this stroke already has one ----
		const existingBBox = this.boxes.get(strokeId);
		if (existingBBox) {
			minX = Math.min(minX, existingBBox.minX);
			minY = Math.min(minY, existingBBox.minY);
			maxX = Math.max(maxX, existingBBox.maxX);
			maxY = Math.max(maxY, existingBBox.maxY);
		}

		const updatedBBox: BoundingBox = {
			minX: Math.max(0, minX), // clamp negative x to canvas edge
			minY: Math.max(0, minY), // clamp negative y to canvas edge
			maxX,
			maxY,
		};

		logger.debug(
			'old bbox:',
			existingBBox,
			'for the points:',
			newPoints,
			'for the strokeId:',
			strokeId,
			'new bbox:',
			updatedBBox,
		);

		// ---- persist and sync grid ----
		this.boxes.set(strokeId, updatedBBox);
		this.spatialGrid.addPacket(strokeId, canvasMessageId, updatedBBox);
	}

	// RETRIEVAL
	/** Returns the single AABB for the stroke, or undefined if not yet stored. */
	get(strokeId: string): BoundingBox | undefined {
		return this.boxes.get(strokeId);
	}

	// CLEANUP
	/** Remove the bbox for one stroke (e.g. when it is cleared or erased). */
	delete(strokeId: string) {
		this.boxes.delete(strokeId);
	}

	clear() {
		this.boxes.clear();
	}
}
