import {
	BoundingBox,
	CanvasOperation,
	DrawingOperation,
	DrawingPoint,
	EraserPoint,
	MessageStatus,
} from '@/types';

import { BoundingBoxStore } from './BoundingBoxStore';
import { ErasureStore } from './ErasureStore';
import { PacketStore } from './PacketStore';
import { SpatialGrid } from './SpatialGrid';

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

	constructor(options: CanvasStateOptions) {
		this.spatialGrid = new SpatialGrid(
			options.canvasWidth,
			options.canvasHeight,
			options.gridSize,
		);

		this.erasureStore = new ErasureStore();

		this.boundingBoxStore = new BoundingBoxStore(
			options.canvasWidth,
			options.canvasHeight,
			this.spatialGrid,
		);

		this.packetStore = new PacketStore(
			this.boundingBoxStore,
			this.erasureStore,
		);
	}

	// PACKET STORAGE
	storePacket(packet: CanvasOperation) {
		this.packetStore.store(packet);
	}

	updatePacketStatus(
		actionId: string,
		canvasMessageId: string,
		status: MessageStatus,
	): boolean {
		return this.packetStore.updateStatus(actionId, canvasMessageId, status);
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

	addPacketToGrid(
		strokeId: string,
		canvasMessageId: string,
		bbox: BoundingBox,
	) {
		this.spatialGrid.addPacket(strokeId, canvasMessageId, bbox);
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
		return this.packetStore.get(actionId, canvasMessageId);
	}

	getPreviousPacket(packet: CanvasOperation): CanvasOperation | undefined {
		return this.packetStore.getPrevious(packet);
	}

	getPoints(actionId: string, canvasMessageId: string) {
		return this.packetStore.getPoints(actionId, canvasMessageId);
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

	getAllNonErasedDrawingPackets(): DrawingOperation[] {
		return this.packetStore.getAllNonErasedDrawingPackets();
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
	canvasWidth: 1800,
	canvasHeight: 1000,
});
