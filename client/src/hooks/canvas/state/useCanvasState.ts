import { useRef } from 'react';
import {
	BoundingBox,
	DrawingPoint,
	EraserPoint,
	PacketStatus,
	Packet,
	PacketType,
	DrawingPacket,
} from '@/types';
import logger from '../../../util/logger';

type CanvasStateProps = {
	canvasWidth: number;
	canvasHeight: number;
	gridSize?: number;
};

export type StoreStrokeInterpolatedPointsFn = (
	strokeId: string,
	packetId: string,
	points: DrawingPoint[],
) => void;

export const useCanvasState = (options: CanvasStateProps) => {
	// ============================================================================
	// STATE - Core Storage
	// ============================================================================

	/** All packets (strokes + eraser actions): actionId -> packetId -> Packet */
	const allPackets = useRef<Map<string, Map<string, Packet>>>(new Map());

	/** Interpolated points for strokes only: strokeId -> packetId -> DrawingPoint[] */
	const strokeInterpolatedPoints = useRef<
		Map<string, Map<string, DrawingPoint[]>>
	>(new Map());

	// ============================================================================
	// STATE - Indexes for Performance
	// ============================================================================

	/** Packets needing retry: actionId -> Set<packetId> */
	const needsRetryIndex = useRef<Map<string, Set<string>>>(new Map());

	/** Packets pending send: actionId -> Set<packetId> */
	const pendingSendIndex = useRef<Map<string, Set<string>>>(new Map());

	/** Strokes that have been erased: strokeId*/
	const erasedStrokesIndex = useRef<Set<string>>(new Set());

	// ============================================================================
	// STATE - Spatial Index (Strokes Only)
	// ============================================================================

	const GRID_SIZE = options?.gridSize ?? 100;
	const GRID_COLS = Math.ceil(options.canvasWidth / GRID_SIZE);
	const GRID_ROWS = Math.ceil(options.canvasHeight / GRID_SIZE);

	/** Bounding boxes for strokes (used for collision detection) actionId -> bbox*/
	const strokeBoundingBoxes = useRef<Map<string, BoundingBox>>(new Map());

	/** Spatial grid: cellId -> Set<actionId> */
	const spatialGrid = useRef<Map<number, Set<string>>>(new Map());

	// ============================================================================
	// SPATIAL GRID - Helper Functions
	// ============================================================================

	const pointToGridCell = (x: number, y: number): number => {
		const cellX = Math.floor(x / GRID_SIZE);
		const cellY = Math.floor(y / GRID_SIZE);
		return cellY * GRID_COLS + cellX;
	};

	const addStrokeToGrid = (strokeId: string, bbox: BoundingBox) => {
		const minCellX = Math.floor(bbox.minX / GRID_SIZE);
		const maxCellX = Math.floor(bbox.maxX / GRID_SIZE);
		const minCellY = Math.floor(bbox.minY / GRID_SIZE);
		const maxCellY = Math.floor(bbox.maxY / GRID_SIZE);

		let hasOutOfBounds = false;
		for (let cy = minCellY; cy <= maxCellY; cy++) {
			for (let cx = minCellX; cx <= maxCellX; cx++) {
				if (cx < 0 || cx >= GRID_COLS || cy < 0 || cy >= GRID_ROWS) {
					hasOutOfBounds = true;
					continue;
				}

				const cellId = cy * GRID_COLS + cx;
				if (!spatialGrid.current.has(cellId)) {
					spatialGrid.current.set(cellId, new Set());
				}
				spatialGrid.current.get(cellId)!.add(strokeId);
			}
		}

		if (hasOutOfBounds) {
			logger.warn('Stroke bounding box extends outside grid bounds', {
				strokeId,
				bbox,
				gridBounds: {
					cols: GRID_COLS,
					rows: GRID_ROWS,
					cellRange: {
						x: [minCellX, maxCellX],
						y: [minCellY, maxCellY],
					},
				},
			});
		}
	};

	const removeStrokeFromGrid = (strokeId: string) => {
		spatialGrid.current.forEach((cellStrokes) => {
			cellStrokes.delete(strokeId);
		});
	};

	const getStrokeIdsNearPoint = (point: EraserPoint): string[] => {
		const centerCell = pointToGridCell(point.x, point.y);
		logger.debug('center Cell for the eraser: ', centerCell);
		const centerX = centerCell % GRID_COLS;
		const centerY = Math.floor(centerCell / GRID_COLS);

		const nearbyStrokeIds = new Set<string>();

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const cellX = centerX + dx;
				const cellY = centerY + dy;

				if (cellX < 0 || cellX >= GRID_COLS || cellY < 0 || cellY >= GRID_ROWS)
					continue;

				const cellId = cellY * GRID_COLS + cellX;
				const strokeIds = spatialGrid.current.get(cellId);

				if (strokeIds) {
					strokeIds.forEach((id) => nearbyStrokeIds.add(id));
				}
			}
		}

		return Array.from(nearbyStrokeIds);
	};

	const getSpatialGridState = () => {
		spatialGrid.current.keys().forEach((key) => {
			console.log(
				'spatial grid key',
				key,
				'spatialGrid value: ',
				spatialGrid.current.get(key),
			);
		});
	};

	// ============================================================================
	// BOUNDING BOX - Stroke Management
	// ============================================================================

	const updateStrokeBoundingBox = (
		strokeId: string,
		newPoints: DrawingPoint[],
	) => {
		if (newPoints.length === 0) return;

		const existingBBox = strokeBoundingBoxes.current.get(strokeId);

		let minX = newPoints[0].x;
		let minY = newPoints[0].y;
		let maxX = newPoints[0].x;
		let maxY = newPoints[0].y;
		let maxBrushSize = newPoints[0].brushSize || 0;

		for (const point of newPoints) {
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			maxBrushSize = Math.max(maxBrushSize, point.brushSize || 0);
		}

		const halfBrush = maxBrushSize / 2;

		if (existingBBox) {
			const mergedBBox: BoundingBox = {
				minX: Math.min(existingBBox.minX, minX - halfBrush),
				minY: Math.min(existingBBox.minY, minY - halfBrush),
				maxX: Math.max(existingBBox.maxX, maxX + halfBrush),
				maxY: Math.max(existingBBox.maxY, maxY + halfBrush),
			};

			removeStrokeFromGrid(strokeId);
			addStrokeToGrid(strokeId, mergedBBox);
			strokeBoundingBoxes.current.set(strokeId, mergedBBox);
		} else {
			const newBBox: BoundingBox = {
				minX: minX - halfBrush,
				minY: minY - halfBrush,
				maxX: maxX + halfBrush,
				maxY: maxY + halfBrush,
			};
			addStrokeToGrid(strokeId, newBBox);
			strokeBoundingBoxes.current.set(strokeId, newBBox);
		}
	};

	const getStrokeBoundingBox = (strokeId: string) => {
		return strokeBoundingBoxes.current.get(strokeId);
	};

	// ============================================================================
	// PACKET STORAGE - Create/Update
	// ============================================================================

	function storePacket(packet: Packet) {
		let packetMap = allPackets.current.get(packet.strokeId);

		if (!packetMap) {
			packetMap = new Map();
			allPackets.current.set(packet.strokeId, packetMap);
		}

		packetMap.set(packet.packetId, packet);

		if (packet.type === PacketType.DRAWING) {
			updateStrokeBoundingBox(packet.strokeId, packet.points);
		}

		if (packet.status === PacketStatus.CREATED) {
			if (!pendingSendIndex.current.has(packet.strokeId)) {
				pendingSendIndex.current.set(packet.strokeId, new Set());
			}
			pendingSendIndex.current.get(packet.strokeId)!.add(packet.packetId);
		} else if (packet.status === PacketStatus.FAILED) {
			if (!needsRetryIndex.current.has(packet.strokeId)) {
				needsRetryIndex.current.set(packet.strokeId, new Set());
			}
			needsRetryIndex.current.get(packet.strokeId)!.add(packet.packetId);
		}
	}

	const updatePacketStatus = (
		actionId: string,
		packetId: string,
		status: PacketStatus,
	): boolean => {
		const packet = allPackets.current.get(actionId)?.get(packetId);

		if (!packet) {
			console.warn(`Packet not found: ${actionId}/${packetId}`);
			return false;
		}

		needsRetryIndex.current.get(actionId)?.delete(packetId);
		pendingSendIndex.current.get(actionId)?.delete(packetId);

		const updatedPacket: Packet = {
			...packet,
			status,
			lastAttemptTimestamp:
				status === PacketStatus.SENDING
					? Date.now()
					: packet.lastAttemptTimestamp,
		};

		allPackets.current.get(actionId)!.set(packetId, updatedPacket);

		if (status === PacketStatus.FAILED) {
			if (!needsRetryIndex.current.has(actionId)) {
				needsRetryIndex.current.set(actionId, new Set());
			}
			needsRetryIndex.current.get(actionId)!.add(packetId);
		} else if (status === PacketStatus.CREATED) {
			if (!pendingSendIndex.current.has(actionId)) {
				pendingSendIndex.current.set(actionId, new Set());
			}
			pendingSendIndex.current.get(actionId)!.add(packetId);
		}

		return true;
	};

	// ============================================================================
	// INTERPOLATED POINTS - Stroke Only
	// ============================================================================

	/**
	 * Store interpolated points for a stroke packet
	 * Only used for strokes (for collision detection)
	 */
	const storeStrokeInterpolatedPoints: StoreStrokeInterpolatedPointsFn = (
		strokeId,
		packetId,
		points,
	) => {
		let interpolatedPointMap = strokeInterpolatedPoints.current.get(strokeId);
		if (!interpolatedPointMap) {
			interpolatedPointMap = new Map();
			strokeInterpolatedPoints.current.set(strokeId, interpolatedPointMap);
		}
		interpolatedPointMap.set(packetId, points);
	};

	// const getAllStrokeInterpolatedPoints = () => {
	// 	const points = [];
	// 	strokeInterpolatedPoints.current.keys().forEach((key) => {
	// 		strokeInterpolatedPoints.current.get(key).forEach((point) => {
	// 			points.push(point);
	// 		});
	// 	});
	// 	return points;
	// };

	const getStrokeInterpolatedPoints = (
		strokeId: string,
		packetId: string,
	): DrawingPoint[] | undefined => {
		return strokeInterpolatedPoints.current.get(strokeId)?.get(packetId);
	};

	// ============================================================================
	// PACKET RETRIEVAL - Queries
	// ============================================================================

	const getPacket = (
		actionId: string,
		packetId: string,
	): Packet | undefined => {
		return allPackets.current.get(actionId)?.get(packetId) as
			| Packet
			| undefined;
	};

	const getPreviousPacket = (packet: Packet): Packet | undefined => {
		if (packet.packetSequenceNumber === 1) return undefined;

		const prevId = `${packet.strokeId}-${packet.packetSequenceNumber - 1}`;
		return getPacket(packet.strokeId, prevId);
	};

	const getPoints = (actionId: string, packetId: string) => {
		return allPackets.current.get(actionId)?.get(packetId)?.points;
	};

	const getAllPackets = () => {
		return allPackets.current.entries();
	};

	const getAllPacketsForAnAction = (actionId: string) => {
		const packetMap = allPackets.current.get(actionId);
		if (!packetMap) return undefined;

		return Array.from(packetMap.values())
			.map((p) => p)
			.sort((a, b) => a.packetSequenceNumber - b.packetSequenceNumber);
	};

	const getAllActions = () => {
		const packets: Packet[][] = [];
		const actionIds = getAllActionIds();
		actionIds.forEach((actionId) => {
			const packet = getAllPacketsForAnAction(actionId);
			packets.push(packet);
		});
		return packets;
	};

	const getAllNonErasedDrawingPackets = (): DrawingPacket[] => {
		const NonErasedActionIds = [];

		for (const [actionId, actionMap] of allPackets.current.entries()) {
			if (isStrokeErased(actionId)) continue;
			for (const packet of actionMap.values()) {
				if (packet.type !== PacketType.DRAWING || packet.isErased) {
					continue;
				}
				NonErasedActionIds.push(packet);
			}
		}
		return NonErasedActionIds;
	};

	// ============================================================================
	// PACKET RETRIEVAL - Status-Based
	// ============================================================================

	const getPacketsToSendForAction = (actionId: string) => {
		const packetIds = pendingSendIndex.current.get(actionId);
		if (!packetIds || packetIds.size === 0) return [];

		const packetMap = allPackets.current.get(actionId);
		if (!packetMap) return [];

		const packets: Packet[] = [];
		packetIds.forEach((packetId) => {
			const packet = packetMap.get(packetId);
			if (packet) packets.push(packet);
		});

		return packets.sort(
			(a, b) => a.packetSequenceNumber - b.packetSequenceNumber,
		);
	};

	const getAllPacketsToSend = (): Packet[] => {
		const result: Packet[] = [];

		for (const actionId of pendingSendIndex.current.keys()) {
			const pendingPackets = pendingSendIndex.current.get(actionId);
			if (!pendingPackets) continue;

			for (const packetId of pendingPackets) {
				const packet = getPacket(actionId, packetId);
				if (packet) result.push(packet);
			}
		}

		return result;
	};

	const getAllPacketsNeedingRetry = (): Packet[] => {
		const result: Packet[] = [];

		for (const actionId of needsRetryIndex.current.keys()) {
			const needsRetryPackets = needsRetryIndex.current.get(actionId);
			if (!needsRetryPackets) continue;

			for (const packetId of needsRetryPackets) {
				const packet = getPacket(actionId, packetId);
				if (packet) result.push(packet);
			}
		}
		return result;
	};

	// ============================================================================
	// ERASURE - Stroke Management
	// ============================================================================

	const markStrokeErased = (strokeId: string) => {
		erasedStrokesIndex.current.add(strokeId);
	};

	const isStrokeErased = (strokeId: string) => {
		return erasedStrokesIndex.current.has(strokeId);
	};

	// ============================================================================
	// QUERIES - Existence & Counts
	// ============================================================================

	const hasAction = (actionId: string): boolean => {
		return allPackets.current.has(actionId);
	};

	const hasPacket = (actionId: string, packetId: string): boolean => {
		return allPackets.current.get(actionId)?.has(packetId) ?? false;
	};

	const getPacketCount = (actionId: string): number => {
		return allPackets.current.get(actionId)?.size ?? 0;
	};

	const hasPendingSends = (actionId: string): boolean => {
		const packetIds = pendingSendIndex.current.get(actionId);
		return packetIds ? packetIds.size > 0 : false;
	};

	const hasFailedPackets = (actionId: string): boolean => {
		const packetIds = needsRetryIndex.current.get(actionId);
		return packetIds ? packetIds.size > 0 : false;
	};

	const getActionStatusCounts = (actionId: string) => {
		return {
			pending: pendingSendIndex.current.get(actionId)?.size || 0,
			failed: needsRetryIndex.current.get(actionId)?.size || 0,
		};
	};

	const getAllActionIds = (): string[] => {
		return Array.from(allPackets.current.keys());
	};

	// ============================================================================
	// CLEANUP
	// ============================================================================

	const clearAction = (actionId: string) => {
		needsRetryIndex.current.delete(actionId);
		pendingSendIndex.current.delete(actionId);
		allPackets.current.delete(actionId);
		strokeInterpolatedPoints.current.delete(actionId);
		strokeBoundingBoxes.current.delete(actionId);
		removeStrokeFromGrid(actionId);
		erasedStrokesIndex.current.delete(actionId);
	};

	const clearAllActions = () => {
		allPackets.current.clear();
		needsRetryIndex.current.clear();
		pendingSendIndex.current.clear();
		strokeInterpolatedPoints.current.clear();
		strokeBoundingBoxes.current.clear();
		spatialGrid.current.clear();
		erasedStrokesIndex.current.clear();
	};

	// ============================================================================
	// MONITORING
	// ============================================================================

	const getStats = () => {
		let total = 0;
		let created = 0;
		let sending = 0;
		let sent = 0;
		let acknowledged = 0;
		let failed = 0;
		let abandoned = 0;

		allPackets.current.forEach((packetMap) => {
			packetMap.forEach((packet) => {
				total++;
				switch (packet.status) {
					case PacketStatus.CREATED:
						created++;
						break;
					case PacketStatus.SENDING:
						sending++;
						break;
					case PacketStatus.SENT:
						sent++;
						break;
					case PacketStatus.ACKNOWLEDGED:
						acknowledged++;
						break;
					case PacketStatus.FAILED:
						failed++;
						break;
					case PacketStatus.ABANDONED:
						abandoned++;
						break;
				}
			});
		});

		return {
			total,
			created,
			sending,
			sent,
			acknowledged,
			failed,
			abandoned,
			actionsWithPending: pendingSendIndex.current.size,
			actionsWithFailed: needsRetryIndex.current.size,
		};
	};

	// ============================================================================
	// RETURN API
	// ============================================================================

	return {
		// Packet storage
		storePacket,
		updatePacketStatus,

		// Interpolated points (strokes only)
		storeStrokeInterpolatedPoints,
		getStrokeInterpolatedPoints,
		// getAllStrokeInterpolatedPoints,

		// Spatial grid (strokes only)
		addStrokeToGrid,
		pointToGridCell,
		removeStrokeFromGrid,
		getStrokeIdsNearPoint,
		getSpatialGridState,
		getStrokeBoundingBox,

		// Erasure
		markStrokeErased,
		isStrokeErased,

		// Packet retrieval
		getPacket,
		getPreviousPacket,
		getPoints,
		getPacketsToSendForAction,
		getAllActions,
		getAllPacketsForAnAction,
		getAllPackets,
		getAllNonErasedDrawingPackets,
		getAllPacketsToSend,
		getAllPacketsNeedingRetry,

		// Queries
		hasAction,
		hasPacket,
		getPacketCount,
		hasPendingSends,
		hasFailedPackets,
		getActionStatusCounts,
		getAllActionIds,

		// Cleanup
		clearAction,
		clearAllActions,

		// Monitoring
		getStats,
	};
};
