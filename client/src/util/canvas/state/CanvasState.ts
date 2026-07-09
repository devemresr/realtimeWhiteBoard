import {
	BoundingBox,
	CanvasOperation,
	CanvasOperationType,
	DrawingOperation,
	DrawingPoint,
	EraserPoint,
	MessageStatus,
} from '@/types';

import { BoundingBoxStore } from './BoundingBoxStore';
import { ErasureStore } from './ErasureStore';
import { PacketStore } from './PacketStore';
import { SpatialGrid } from './SpatialGrid';
import logger from 'src/util/logger';
import {
	pointsToAbsolute,
	pointsToRelative,
	toAbsolute,
} from './CanvasState.helpers';

export type StoreStrokeInterpolatedPointsFn = (
	strokeId: string,
	canvasMessageId: string,
	points: DrawingPoint[],
) => void;

type CanvasStateOptions = {
	canvasWidth: number;
	canvasHeight: number;
	gridSize?: number;
};

/**
 * CanvasState
 *
 * Plain class that wires together the four specialised stores and exposes
 * a single, stable API to the rest of the application.  Intended to be
 * instantiated once and shared via React context - no React dependencies.
 *
 * Responsibilities delegated to sub-stores
 * ----------------------------------------
 * SpatialGrid      - cell-based index for fast "what's near this point?" queries
 * BoundingBoxStore - per-stroke AABB maintenance (delegates grid updates to SpatialGrid)
 * ErasureStore     - tracks which strokes have been erased
 * PacketStore      - canonical packet storage, status indexes, interpolated points
 *
 * Dependency graph
 * ----------------
 *   CanvasState
 *     └─ PacketStore
 *          └─ BoundingBoxStore   (notified when new points arrive)
 *               └─ SpatialGrid   (receives bbox updates to index strokes spatially)
 *          └─ ErasureStore       (filters erased strokes during retrieval)
 */
class CanvasState {
	private readonly spatialGrid: SpatialGrid;
	private readonly erasureStore: ErasureStore;
	private readonly boundingBoxStore: BoundingBoxStore;
	private readonly packetStore: PacketStore;
	public canvasWidth: number;
	public canvasHeight: number;

	constructor(options: CanvasStateOptions) {
		this.canvasHeight = options.canvasHeight;
		this.canvasWidth = options.canvasWidth;
		this.spatialGrid = new SpatialGrid(
			this.canvasWidth,
			this.canvasHeight,
			options.gridSize,
		);

		this.erasureStore = new ErasureStore();

		this.boundingBoxStore = new BoundingBoxStore(
			this.canvasWidth,
			this.canvasHeight,
			this.spatialGrid,
		);

		this.packetStore = new PacketStore(
			this.boundingBoxStore,
			this.erasureStore,
		);
	}
	updateDimensions(width: number, height: number) {
		// Snapshot packet associations before the grid is cleared.
		this.canvasWidth = width;
		this.canvasHeight = height;
		const strokePackets = this.spatialGrid.snapshotStrokePackets();
		logger.debug(
			{
				strokePackets: Array.from(strokePackets.entries()).map(
					([strokeId, packetIds]) => ({
						strokeId,
						packetIds: Array.from(packetIds),
					}),
				),
			},
			'SNAPSHOTTED packets before grid rebuild',
		);

		// Both stores accept the new dimensions. BoundingBoxStore only updates its
		// canvasWidth/Height - stored entries are untouched. SpatialGrid recomputes
		// GRID_COLS/ROWS and clears the grid.
		this.boundingBoxStore.updateDimensions(width, height);
		this.spatialGrid.updateDimensions(width, height);

		// Reinsert using bboxes scaled to the new dimensions. get() performs a
		// single scale from each entry's captured origin size - no round-trip drift.
		this.spatialGrid.rebuild(strokePackets, (strokeId) =>
			this.boundingBoxStore.get(strokeId),
		);
	}

	// HELPERS
	private toRelativePacket(packet: CanvasOperation): CanvasOperation {
		logger.debug({ packet, points: packet.points }, 'inside torelativePacket');
		return {
			...packet,
			points:
				packet.points.length !== 0
					? pointsToRelative(packet.points, this.canvasWidth, this.canvasHeight)
					: [],
		};
	}

	private toAbsolutePacket(packet: CanvasOperation): CanvasOperation {
		logger.debug({ packet, points: packet.points }, 'inside toabsolutePacket');
		return {
			...packet,
			points:
				packet.points.length !== 0
					? pointsToAbsolute(packet.points, this.canvasWidth, this.canvasHeight)
					: [],
		};
	}

	// PACKET STORAGE
	storePacket(packet: CanvasOperation) {
		logger.debug({ packet }, 'storing packet');

		// bbox update always uses absolute points - must happen before conversion
		if (packet.type === CanvasOperationType.DRAWING) {
			this.boundingBoxStore.update(
				packet.strokeId,
				packet.canvasMessageId,
				packet.points, // still absolute here
			);
		}

		this.packetStore.storePacket(this.toRelativePacket(packet));
	}

	updatePacketStatus(
		actionId: string,
		canvasMessageId: string,
		status: MessageStatus,
	): boolean {
		return this.packetStore.updatePacketStatus(
			actionId,
			canvasMessageId,
			status,
		);
	}

	// INTERPOLATED POINTS (strokes only)
	storeStrokeInterpolatedPoints(
		strokeId: string,
		canvasMessageId: string,
		points: DrawingPoint[],
	) {
		this.packetStore.storeInterpolatedPoints(strokeId, canvasMessageId, points);
	}

	getStrokeInterpolatedPoints(
		strokeId: string,
		canvasMessageId: string,
	): DrawingPoint[] | undefined {
		return this.packetStore.getInterpolatedPoints(strokeId, canvasMessageId);
	}

	// SPATIAL GRID (strokes only)
	getPacketIdsNearPoint(point: EraserPoint): Map<string, Set<string>> {
		return this.spatialGrid.getPacketIdsNearPoint(point);
	}

	pointToGridCell(x: number, y: number): number {
		return this.spatialGrid.pointToGridCell(x, y);
	}

	removeStrokeFromGrid(strokeId: string) {
		this.spatialGrid.removeStroke(strokeId);
	}

	getStrokeIdsNearPoint(point: EraserPoint): string[] {
		return this.spatialGrid.getStrokeIdsNearPoint(point);
	}

	getSpatialGridState() {
		this.spatialGrid.logState();
	}

	getStrokeBoundingBox(strokeId: string): BoundingBox | undefined {
		return this.boundingBoxStore.get(strokeId);
	}

	// ERASURE
	markStrokeErased(strokeId: string) {
		this.erasureStore.mark(strokeId);
	}

	isStrokeErased(strokeId: string): boolean {
		return this.erasureStore.isErased(strokeId);
	}

	// PACKET RETRIEVAL
	getPacket(
		actionId: string,
		canvasMessageId: string,
	): CanvasOperation | undefined {
		const packet = this.packetStore.getPacket(actionId, canvasMessageId);
		if (!packet) return undefined;
		return this.toAbsolutePacket(packet);
	}

	getActionIdsByType(type: CanvasOperationType) {
		return this.packetStore.getActionIdsByType(type) ?? new Set();
	}

	getPreviousPacket(packet: CanvasOperation): CanvasOperation | undefined {
		const prev = this.packetStore.getPreviousPacket(packet);
		if (!prev) return undefined;
		return this.toAbsolutePacket(prev);
	}

	getPacketsToSendForAction(actionId: string): CanvasOperation[] {
		return this.packetStore.getPendingForAction(actionId);
	}

	getAllActions(): CanvasOperation[][] {
		return this.packetStore.getAllActions();
	}

	getAllPacketsForAnAction(actionId: string): CanvasOperation[] | undefined {
		return this.packetStore.getAllForAction(actionId);
	}

	getAllPackets() {
		return this.packetStore.getAllEntries();
	}

	getAllStrokeIds() {
		return this.packetStore.getAllStrokeIds();
	}

	getAllNonErasedDrawingPackets(): DrawingOperation[] {
		return this.packetStore
			.getAllNonErasedDrawingPackets()
			.map((packet) => this.toAbsolutePacket(packet) as DrawingOperation);
	}

	getAllPacketsToSend(): CanvasOperation[] {
		return this.packetStore.getAllPending();
	}

	getAllPacketsNeedingRetry(): CanvasOperation[] {
		return this.packetStore.getAllNeedingRetry();
	}

	// QUERIES
	hasAction(actionId: string): boolean {
		return this.packetStore.hasAction(actionId);
	}

	hasPacket(actionId: string, canvasMessageId: string): boolean {
		return this.packetStore.hasPacket(actionId, canvasMessageId);
	}

	getPacketCount(actionId: string): number {
		return this.packetStore.packetCount(actionId);
	}

	hasPendingSends(actionId: string): boolean {
		return this.packetStore.hasPendingSends(actionId);
	}

	hasFailedPackets(actionId: string): boolean {
		return this.packetStore.hasFailedPackets(actionId);
	}

	getActionStatusCounts(actionId: string) {
		return this.packetStore.getStatusCounts(actionId);
	}

	getAllActionIds(): string[] {
		return this.packetStore.getAllActionIds();
	}

	// CLEANUP
	clearAction(actionId: string) {
		this.packetStore.deleteAction(actionId);
		this.boundingBoxStore.delete(actionId);
		this.spatialGrid.removeStroke(actionId);
		this.erasureStore.delete(actionId);
	}

	clearAllActions() {
		this.packetStore.clear();
		this.boundingBoxStore.clear();
		this.spatialGrid.clear();
		this.erasureStore.clear();
	}

	// MONITORING
	getStats() {
		return this.packetStore.getStats();
	}
}

export const canvasState = new CanvasState({
	canvasWidth: 0, // will be set correctly on mount
	canvasHeight: 0,
});
