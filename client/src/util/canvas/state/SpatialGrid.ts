import { BoundingBox, DrawingPoint, EraserPoint } from '@/types';
import logger from 'src/util/logger';

/**
 * SpatialGrid
 *
 * Manages a 2-D grid index that maps canvas cells => stroke IDs => packet IDs.
 * Used for fast spatial queries (e.g. "which strokes are near the eraser?")
 * without iterating every stroke on the canvas.
 *
 * Coordinate system
 * -----------------
 * The canvas is divided into uniform square cells of size `gridSize`.
 * Each cell is identified by a single integer: cellId = cellY * GRID_COLS + cellX.
 *
 * Data layout
 * -----------
 * spatialGrid: Map<cellId, Map<strokeId, Set<canvasMessageId>>>
 *
 * A stroke can span multiple cells (when its bounding box crosses cell boundaries).
 * A packet belonging to a stroke is recorded in every cell the stroke's bbox touches.
 */
export class SpatialGrid {
	private readonly GRID_SIZE: number;
	private readonly GRID_COLS: number;
	private readonly GRID_ROWS: number;

	/** cellId -> strokeId -> Set<canvasMessageId> */
	private grid = new Map<number, Map<string, Set<string>>>();

	constructor(canvasWidth: number, canvasHeight: number, gridSize = 100) {
		this.GRID_SIZE = gridSize;
		this.GRID_COLS = Math.ceil(canvasWidth / gridSize);
		this.GRID_ROWS = Math.ceil(canvasHeight / gridSize);
	}

	// PRIVATE HELPERS
	/** Convert an (x, y) canvas coordinate to a flat cell ID. */
	private coordToCell(x: number, y: number): number {
		const cellX = Math.floor(x / this.GRID_SIZE);
		const cellY = Math.floor(y / this.GRID_SIZE);
		return cellY * this.GRID_COLS + cellX;
	}

	/** Returns true when (cellX, cellY) is inside the grid dimensions. */
	private isInBounds(cellX: number, cellY: number): boolean {
		return (
			cellX >= 0 &&
			cellX < this.GRID_COLS &&
			cellY >= 0 &&
			cellY < this.GRID_ROWS
		);
	}

	// INSERTION / REMOVAL
	/**
	 * Register a stroke packet in every cell touched by `bbox`.
	 * Called whenever a packet's bounding box is first computed or updated.
	 */
	addPacket(strokeId: string, canvasMessageId: string, bbox: BoundingBox) {
		const minCellX = Math.floor(bbox.minX / this.GRID_SIZE);
		const maxCellX = Math.floor(bbox.maxX / this.GRID_SIZE);
		const minCellY = Math.floor(bbox.minY / this.GRID_SIZE);
		const maxCellY = Math.floor(bbox.maxY / this.GRID_SIZE);

		let hasOutOfBounds = false;

		for (let cy = minCellY; cy <= maxCellY; cy++) {
			for (let cx = minCellX; cx <= maxCellX; cx++) {
				if (!this.isInBounds(cx, cy)) {
					hasOutOfBounds = true;
					logger.warn(
						'Stroke bounding box extends outside grid the cx < 0 || cx >= GRID_COLS || cy < 0 || cy >= GRID_ROWS',
						cx < 0,
						cx >= this.GRID_COLS,
						cy < 0,
						cy >= this.GRID_ROWS,
						'cx and cy:',
						cx,
						cy,
					);
					continue;
				}

				const cellId = cy * this.GRID_COLS + cx;

				if (!this.grid.has(cellId)) {
					this.grid.set(cellId, new Map());
				}

				const cellActions = this.grid.get(cellId)!;

				if (!cellActions.has(strokeId)) {
					cellActions.set(strokeId, new Set());
				}

				cellActions.get(strokeId)!.add(canvasMessageId);
			}
		}

		if (hasOutOfBounds) {
			logger.warn(
				'Stroke bounding box extends outside grid bounds',
				{
					strokeId,
					canvasMessageId,
					bbox,
					gridBounds: {
						cols: this.GRID_COLS,
						rows: this.GRID_ROWS,
						cellRange: {
							x: [minCellX, maxCellX],
							y: [minCellY, maxCellY],
						},
					},
				},
				JSON.stringify({ minCellX, maxCellX, minCellY, maxCellY }),
			);
		}
	}

	/**
	 * Remove a single packet from all cells it was registered in.
	 * Used when a packet is deleted without removing the entire stroke.
	 */
	removePacket(strokeId: string, canvasMessageId: string) {
		this.grid.forEach((cellActions) => {
			const packetIds = cellActions.get(strokeId);
			if (packetIds) {
				packetIds.delete(canvasMessageId);
				if (packetIds.size === 0) {
					cellActions.delete(strokeId);
				}
			}
		});
	}

	/**
	 * Remove all packets for a stroke from every cell.
	 * Used when an entire stroke is erased or cleared.
	 */
	removeStroke(strokeId: string) {
		this.grid.forEach((cellActions) => {
			cellActions.delete(strokeId);
		});
	}

	// SPATIAL QUERIES
	/**
	 * Returns a flat list of stroke IDs whose cells overlap the 3×3 neighbourhood
	 * around the eraser point. Used as a fast pre-filter before precise hit-testing.
	 */
	getStrokeIdsNearPoint(point: EraserPoint): string[] {
		const nearbyStrokeIds = new Set<string>();

		this.forEachNeighbourCell(point, (cellActions) => {
			cellActions.forEach((_, strokeId) => {
				nearbyStrokeIds.add(strokeId);
			});
		});

		const centerCell = this.coordToCell(point.x, point.y);
		logger.debug('center Cell for the eraser: ', centerCell);

		return Array.from(nearbyStrokeIds);
	}

	/**
	 * Returns a map of strokeId => Set<canvasMessageId> for all packets whose
	 * cells overlap the 3×3 neighbourhood around the eraser point.
	 * More detailed than `getStrokeIdsNearPoint` when packet-level granularity
	 * is required.
	 */
	getPacketIdsNearPoint(point: EraserPoint): Map<string, Set<string>> {
		const nearbyPackets = new Map<string, Set<string>>();

		this.forEachNeighbourCell(point, (cellActions) => {
			cellActions.forEach((packetIds, strokeId) => {
				if (!nearbyPackets.has(strokeId)) {
					nearbyPackets.set(strokeId, new Set());
				}
				packetIds.forEach((pid) => {
					nearbyPackets.get(strokeId)!.add(pid);
				});
			});
		});

		return nearbyPackets;
	}

	/**
	 * Convert an (x, y) point to its grid cell ID.
	 * Exposed so callers can do their own cell-level math if needed.
	 */
	pointToGridCell(x: number, y: number): number {
		return this.coordToCell(x, y);
	}

	// DEBUG
	/** Dump the full grid state to the console for debugging. */
	logState() {
		this.grid.forEach((cellActions, cellId) => {
			console.log('spatial grid cell', cellId);
			cellActions.forEach((packetIds, strokeId) => {
				console.log(
					'  strokeId:',
					strokeId,
					'packetIds:',
					Array.from(packetIds),
				);
			});
		});
	}

	// CLEANUP
	clear() {
		this.grid.clear();
	}

	// PRIVATE UTILITIES
	/**
	 * Iterate over all valid cells in the 3×3 neighbourhood centred on `point`,
	 * calling `callback` for each cell's action map.
	 */
	private forEachNeighbourCell(
		point: EraserPoint,
		callback: (cellActions: Map<string, Set<string>>) => void,
	) {
		const centerCell = this.coordToCell(point.x, point.y);
		const centerX = centerCell % this.GRID_COLS;
		const centerY = Math.floor(centerCell / this.GRID_COLS);

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const cellX = centerX + dx;
				const cellY = centerY + dy;

				if (!this.isInBounds(cellX, cellY)) continue;

				const cellId = cellY * this.GRID_COLS + cellX;
				const cellActions = this.grid.get(cellId);

				if (cellActions) {
					callback(cellActions);
				}
			}
		}
	}
}
