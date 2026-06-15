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
 * - One bbox per stroke, not one per packet. When new packets arrive for an
 *   existing stroke, the stored bbox is *expanded* to encompass the new points
 *   rather than replaced. This matches how strokes grow incrementally.
 * - Brush size is factored into the bbox so that thick strokes don't produce
 *   false misses during eraser hit-testing.
 * - Out-of-canvas-bounds points are logged as warnings but are still included
 *   in the bbox (clamped to 0 on the min side only) so nothing is silently lost.
 *
 * Resize behaviour
 * ----------------
 * Bboxes are stored as relative (0-1) values so they remain valid across canvas
 * resizes without any migration. Conversion to/from absolute pixel coordinates
 * happens only at the store/get boundary. On resize, call updateDimensions() so
 * subsequent reads convert against the new canvas size no data changes needed.
 */
export class BoundingBoxStore {
	/**
	 * strokeId -> BoundingBox stored as relative (0-1) fractions of canvas size.
	 * Always convert to absolute before passing to the spatial grid or callers.
	 */
	private boxes = new Map<string, BoundingBox>();

	constructor(
		private canvasWidth: number,
		private canvasHeight: number,
		private readonly spatialGrid: SpatialGrid,
	) {}

	// RESIZE
	/**
	 * Update canvas dimensions used for absolute -> scaled-absolute conversion on read.
	 * No data migration needed stored values are already absolute with their origin
	 * dimensions captured alongside them. The grid rebuild is handled by CanvasState.
	 */
	updateDimensions(width: number, height: number) {
		this.canvasWidth = width;
		this.canvasHeight = height;
	}

	/**
	 * Returns all stored bboxes scaled to current canvas dimensions.
	 * Used by CanvasState.rebuildGrid() to reinsert all strokes after a resize.
	 */
	getAll(): Map<string, BoundingBox> {
		const absolute = new Map<string, BoundingBox>();
		this.boxes.forEach((_, strokeId) => {
			// Reuse get() so the fast-path and scale logic stays in one place.
			const bbox = this.get(strokeId);
			if (bbox) absolute.set(strokeId, bbox);
		});
		return absolute;
	}

	// UPDATE
	/**
	 * Compute a bounding box for `newPoints`, merge it with any existing bbox
	 * for `strokeId`, persist the result as relative, and sync the spatial grid.
	 *
	 * Called every time a new drawing packet arrives for a stroke.
	 */
	update(strokeId: string, canvasMessageId: string, newPoints: DrawingPoint[]) {
		if (newPoints.length === 0) return;

		// Work in absolute pixels first, then normalise at the end
		const first = newPoints[0];
		const half0 = (first.brushSize || 0) / 2;

		let minX = first.x - half0;
		let minY = first.y - half0;
		let maxX = first.x + half0;
		let maxY = first.y + half0;

		for (const point of newPoints) {
			const half = (point.brushSize || 0) / 2;
			minX = Math.min(minX, point.x - half);
			minY = Math.min(minY, point.y - half);
			maxX = Math.max(maxX, point.x + half);
			maxY = Math.max(maxY, point.y + half);
		}

		// Merge with existing relative bbox (convert to absolute first for the merge)
		const existing = this.get(strokeId); // returns absolute via current dimensions
		if (existing) {
			minX = Math.min(minX, existing.minX);
			minY = Math.min(minY, existing.minY);
			maxX = Math.max(maxX, existing.maxX);
			maxY = Math.max(maxY, existing.maxY);
		}

		// Normalise to relative and store — single source of truth, no origin dims
		this.boxes.set(strokeId, {
			minX: Math.max(0, minX) / this.canvasWidth,
			minY: Math.max(0, minY) / this.canvasHeight,
			maxX: maxX / this.canvasWidth,
			maxY: maxY / this.canvasHeight,
		});

		// Grid always gets absolute pixels
		this.spatialGrid.insertIntoGrid(
			strokeId,
			canvasMessageId,
			this.get(strokeId)!,
		);
	}
	// RETRIEVAL
	get(strokeId: string): BoundingBox | undefined {
		const rel = this.boxes.get(strokeId);
		if (!rel) return undefined;
		return {
			minX: rel.minX * this.canvasWidth,
			minY: rel.minY * this.canvasHeight,
			maxX: rel.maxX * this.canvasWidth,
			maxY: rel.maxY * this.canvasHeight,
		};
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
