import { useRef } from 'react';
import {
	BoundingBox,
	DrawingPoint,
	EraserPoint,
	MessageStatus,
	CanvasOperation,
	CanvasOperationType,
	DrawingOperation,
} from '@/types';
import logger from '../../../util/logger';

type CanvasStateProps = {
	canvasWidth: number;
	canvasHeight: number;
	gridSize?: number;
};

export type StoreStrokeInterpolatedPointsFn = (
	strokeId: string,
	canvasMessageId: string,
	points: DrawingPoint[],
) => void;

export const useCanvasState = (options: CanvasStateProps) => {
	// ============================================================================
	// STATE - Core Storage
	// ============================================================================

	/** All packets (strokes + eraser actions): actionId -> canvasMessageId -> CanvasOperation */
	const allPackets = useRef<Map<string, Map<string, CanvasOperation>>>(
		new Map(),
	);

	/** Interpolated points for strokes only: strokeId -> canvasMessageId -> DrawingPoint[] */
	const strokeInterpolatedPoints = useRef<
		Map<string, Map<string, DrawingPoint[]>>
	>(new Map());

	// ============================================================================
	// STATE - Indexes for Performance
	// ============================================================================

	/** Packets needing retry: actionId -> Set<canvasMessageId> */
	const needsRetryIndex = useRef<Map<string, Set<string>>>(new Map());

	/** Packets pending send: actionId -> Set<canvasMessageId> */
	const pendingSendIndex = useRef<Map<string, Set<string>>>(new Map());

	/** Strokes that have been erased: strokeId*/
	const erasedStrokesIndex = useRef<Set<string>>(new Set());

	// ============================================================================
	// STATE - Spatial Index (Strokes Only)
	// ============================================================================

	const GRID_SIZE = options?.gridSize ?? 100;
	const GRID_COLS = Math.ceil(options.canvasWidth / GRID_SIZE);
	const GRID_ROWS = Math.ceil(options.canvasHeight / GRID_SIZE);

	/** Bounding boxes for strokes (used for collision detection) strokeId -> bbox */
	const strokeBoundingBoxes = useRef<Map<string, BoundingBox>>(new Map());

	/** Spatial grid: cellId -> actionId -> Set<canvasMessageId> */
	const spatialGrid = useRef<Map<number, Map<string, Set<string>>>>(new Map());

	// ============================================================================
	// SPATIAL GRID - Helper Functions
	// ============================================================================

	const pointToGridCell = (x: number, y: number): number => {
		const cellX = Math.floor(x / GRID_SIZE);
		const cellY = Math.floor(y / GRID_SIZE);
		return cellY * GRID_COLS + cellX;
	};

	const addPacketToGrid = (
		strokeId: string,
		canvasMessageId: string,
		bbox: BoundingBox,
	) => {
		const minCellX = Math.floor(bbox.minX / GRID_SIZE);
		const maxCellX = Math.floor(bbox.maxX / GRID_SIZE);
		const minCellY = Math.floor(bbox.minY / GRID_SIZE);
		const maxCellY = Math.floor(bbox.maxY / GRID_SIZE);

		let hasOutOfBounds = false;

		for (let cy = minCellY; cy <= maxCellY; cy++) {
			for (let cx = minCellX; cx <= maxCellX; cx++) {
				if (cx < 0 || cx >= GRID_COLS || cy < 0 || cy >= GRID_ROWS) {
					hasOutOfBounds = true;
					logger.warn(
						'Stroke bounding box extends outside grid the cx < 0 || cx >= GRID_COLS || cy < 0 || cy >= GRID_ROWS',
						cx < 0,
						cx >= GRID_COLS,
						cy < 0,
						cy >= GRID_ROWS,
						'cx and cy:',
						cx,
						cy,
					);
					continue;
				}

				const cellId = cy * GRID_COLS + cx;

				if (!spatialGrid.current.has(cellId)) {
					spatialGrid.current.set(cellId, new Map());
				}

				const cellActions = spatialGrid.current.get(cellId)!;

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
						cols: GRID_COLS,
						rows: GRID_ROWS,
						cellRange: {
							x: [minCellX, maxCellX],
							y: [minCellY, maxCellY],
						},
					},
				},
				JSON.stringify({ minCellX, maxCellX, minCellY, maxCellY }),
			);
		}
	};

	const removePacketFromGrid = (strokeId: string, canvasMessageId: string) => {
		spatialGrid.current.forEach((cellActions) => {
			const packetIds = cellActions.get(strokeId);
			if (packetIds) {
				packetIds.delete(canvasMessageId);
				if (packetIds.size === 0) {
					cellActions.delete(strokeId);
				}
			}
		});
	};

	const removeStrokeFromGrid = (strokeId: string) => {
		spatialGrid.current.forEach((cellActions) => {
			cellActions.delete(strokeId);
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
				const cellActions = spatialGrid.current.get(cellId);

				if (cellActions) {
					cellActions.forEach((_, strokeId) => {
						nearbyStrokeIds.add(strokeId);
					});
				}
			}
		}

		return Array.from(nearbyStrokeIds);
	};

	const getPacketIdsNearPoint = (
		point: EraserPoint,
	): Map<string, Set<string>> => {
		const centerCell = pointToGridCell(point.x, point.y);
		const centerX = centerCell % GRID_COLS;
		const centerY = Math.floor(centerCell / GRID_COLS);

		const nearbyPackets = new Map<string, Set<string>>();

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const cellX = centerX + dx;
				const cellY = centerY + dy;

				if (cellX < 0 || cellX >= GRID_COLS || cellY < 0 || cellY >= GRID_ROWS)
					continue;

				const cellId = cellY * GRID_COLS + cellX;
				const cellActions = spatialGrid.current.get(cellId);

				if (cellActions) {
					cellActions.forEach((packetIds, strokeId) => {
						if (!nearbyPackets.has(strokeId)) {
							nearbyPackets.set(strokeId, new Set());
						}
						packetIds.forEach((pid) => {
							nearbyPackets.get(strokeId)!.add(pid);
						});
					});
				}
			}
		}

		return nearbyPackets;
	};

	const getSpatialGridState = () => {
		spatialGrid.current.forEach((cellActions, cellId) => {
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
	};

	// ============================================================================
	// BOUNDING BOX - Stroke Management
	// ============================================================================

	const updateStrokeBoundingBox = (
		strokeId: string,
		canvasMessageId: string,
		newPoints: DrawingPoint[],
	) => {
		if (Object.keys(newPoints).length === 0) return;

		// Get existing bounding box for this stroke (if any)
		const existingBBox = strokeBoundingBoxes.current.get(strokeId);

		let maxBrushSize = newPoints[0].brushSize || 0;
		const halfBrush = maxBrushSize / 2;
		let minX = newPoints[0].x - halfBrush;
		let minY = newPoints[0].y - halfBrush;
		let maxX = newPoints[0].x + halfBrush;
		let maxY = newPoints[0].y + halfBrush;

		for (const point of newPoints) {
			if (
				point.x < 0 ||
				point.x > options.canvasWidth ||
				point.y < 0 ||
				point.y > options.canvasHeight
			) {
				logger.warn('Point outside canvas bounds:', point);
			}
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
			maxBrushSize = Math.max(maxBrushSize, point.brushSize || 0);
		}

		// If there's an existing bbox, expand it to include new points
		if (existingBBox) {
			minX = Math.min(minX, existingBBox.minX);
			minY = Math.min(minY, existingBBox.minY);
			maxX = Math.max(maxX, existingBBox.maxX);
			maxY = Math.max(maxY, existingBBox.maxY);
		}

		const updatedBBox: BoundingBox = {
			minX: Math.max(0, minX),
			minY: Math.max(0, minY),
			maxX: maxX,
			maxY: maxY,
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

		// Store single bounding box for the entire stroke
		strokeBoundingBoxes.current.set(strokeId, updatedBBox);

		// Update spatial grid with the stroke's full bounding box
		addPacketToGrid(strokeId, canvasMessageId, updatedBBox);
	};

	const getStrokeBoundingBox = (strokeId: string) => {
		return strokeBoundingBoxes.current.get(strokeId);
	};

	const getAllBoundingBoxesForStroke = (strokeId: string) => {
		return strokeBoundingBoxes.current.get(strokeId);
	};

	// ============================================================================
	// PACKET STORAGE - Create/Update
	// ============================================================================

	function storePacket(packet: CanvasOperation) {
		let packetMap = allPackets.current.get(packet.strokeId);
		if (!packetMap) {
			packetMap = new Map();
			allPackets.current.set(packet.strokeId, packetMap);
		}

		packetMap.set(packet.canvasMessageId, packet);

		if (packet.type === CanvasOperationType.DRAWING) {
			updateStrokeBoundingBox(
				packet.strokeId,
				packet.canvasMessageId,
				packet.points,
			);
		}

		if (packet.status === MessageStatus.CREATED) {
			if (!pendingSendIndex.current.has(packet.strokeId)) {
				pendingSendIndex.current.set(packet.strokeId, new Set());
			}
			pendingSendIndex.current
				.get(packet.strokeId)!
				.add(packet.canvasMessageId);
		} else if (packet.status === MessageStatus.FAILED) {
			if (!needsRetryIndex.current.has(packet.strokeId)) {
				needsRetryIndex.current.set(packet.strokeId, new Set());
			}
			needsRetryIndex.current.get(packet.strokeId)!.add(packet.canvasMessageId);
		}
	}

	const updatePacketStatus = (
		actionId: string,
		canvasMessageId: string,
		status: MessageStatus,
	): boolean => {
		const packet = allPackets.current.get(actionId)?.get(canvasMessageId);

		if (!packet) {
			console.warn(`CanvasOperation not found: ${actionId}/${canvasMessageId}`);
			return false;
		}

		needsRetryIndex.current.get(actionId)?.delete(canvasMessageId);
		pendingSendIndex.current.get(actionId)?.delete(canvasMessageId);

		const updatedPacket: CanvasOperation = {
			...packet,
			status,
			lastAttemptTimestamp:
				status === MessageStatus.SENDING
					? Date.now()
					: packet.lastAttemptTimestamp,
		};

		allPackets.current.get(actionId)!.set(canvasMessageId, updatedPacket);

		if (status === MessageStatus.FAILED) {
			if (!needsRetryIndex.current.has(actionId)) {
				needsRetryIndex.current.set(actionId, new Set());
			}
			needsRetryIndex.current.get(actionId)!.add(canvasMessageId);
		} else if (status === MessageStatus.CREATED) {
			if (!pendingSendIndex.current.has(actionId)) {
				pendingSendIndex.current.set(actionId, new Set());
			}
			pendingSendIndex.current.get(actionId)!.add(canvasMessageId);
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
		canvasMessageId,
		points,
	) => {
		let interpolatedPointMap = strokeInterpolatedPoints.current.get(strokeId);
		if (!interpolatedPointMap) {
			interpolatedPointMap = new Map();
			strokeInterpolatedPoints.current.set(strokeId, interpolatedPointMap);
		}
		interpolatedPointMap.set(canvasMessageId, points);
	};

	const getStrokeInterpolatedPoints = (
		strokeId: string,
		canvasMessageId: string,
	): DrawingPoint[] | undefined => {
		return strokeInterpolatedPoints.current.get(strokeId)?.get(canvasMessageId);
	};

	// ============================================================================
	// PACKET RETRIEVAL - Queries
	// ============================================================================

	const getPacket = (
		actionId: string,
		canvasMessageId: string,
	): CanvasOperation | undefined => {
		return allPackets.current.get(actionId)?.get(canvasMessageId) as
			| CanvasOperation
			| undefined;
	};

	const getPreviousPacket = (
		packet: CanvasOperation,
	): CanvasOperation | undefined => {
		if (packet.packetSequenceNumber === 1) return undefined;

		const prevId = `${packet.strokeId}-${packet.packetSequenceNumber - 1}`;
		return getPacket(packet.strokeId, prevId);
	};

	const getPoints = (actionId: string, canvasMessageId: string) => {
		return allPackets.current.get(actionId)?.get(canvasMessageId)?.points;
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
		const packets: CanvasOperation[][] = [];
		const actionIds = getAllActionIds();
		actionIds.forEach((actionId) => {
			const packet = getAllPacketsForAnAction(actionId);
			packets.push(packet);
		});
		return packets;
	};

	const getAllNonErasedDrawingPackets = (): DrawingOperation[] => {
		const NonErasedActionIds = [];

		for (const [actionId, actionMap] of allPackets.current.entries()) {
			if (isStrokeErased(actionId)) continue;
			for (const packet of actionMap.values()) {
				if (packet.type !== CanvasOperationType.DRAWING) {
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

		const packets: CanvasOperation[] = [];
		packetIds.forEach((canvasMessageId) => {
			const packet = packetMap.get(canvasMessageId);
			if (packet) packets.push(packet);
		});

		return packets.sort(
			(a, b) => a.packetSequenceNumber - b.packetSequenceNumber,
		);
	};

	const getAllPacketsToSend = (): CanvasOperation[] => {
		const result: CanvasOperation[] = [];

		for (const actionId of pendingSendIndex.current.keys()) {
			const pendingPackets = pendingSendIndex.current.get(actionId);
			if (!pendingPackets) continue;

			for (const canvasMessageId of pendingPackets) {
				const packet = getPacket(actionId, canvasMessageId);
				if (packet) result.push(packet);
			}
		}

		return result;
	};

	const getAllPacketsNeedingRetry = (): CanvasOperation[] => {
		const result: CanvasOperation[] = [];

		for (const actionId of needsRetryIndex.current.keys()) {
			const needsRetryPackets = needsRetryIndex.current.get(actionId);
			if (!needsRetryPackets) continue;

			for (const canvasMessageId of needsRetryPackets) {
				const packet = getPacket(actionId, canvasMessageId);
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

	const hasPacket = (actionId: string, canvasMessageId: string): boolean => {
		return allPackets.current.get(actionId)?.has(canvasMessageId) ?? false;
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
					case MessageStatus.CREATED:
						created++;
						break;
					case MessageStatus.SENDING:
						sending++;
						break;
					case MessageStatus.SENT:
						sent++;
						break;
					case MessageStatus.ACKNOWLEDGED:
						acknowledged++;
						break;
					case MessageStatus.FAILED:
						failed++;
						break;
					case MessageStatus.ABANDONED:
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
		// CanvasOperation storage
		storePacket,
		updatePacketStatus,

		// Interpolated points (strokes only)
		storeStrokeInterpolatedPoints,
		getStrokeInterpolatedPoints,
		// getAllStrokeInterpolatedPoints,

		// Spatial grid (strokes only)
		getPacketIdsNearPoint,
		addPacketToGrid,
		pointToGridCell,
		removeStrokeFromGrid,
		getStrokeIdsNearPoint,
		getSpatialGridState,
		getStrokeBoundingBox,

		// Erasure
		markStrokeErased,
		isStrokeErased,

		// CanvasOperation retrieval
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
