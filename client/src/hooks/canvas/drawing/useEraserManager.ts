import { useCallback } from 'react';
import { DrawingPoint, EraserPoint, CanvasOperationType } from '@/types';
import logger from '../../../util/logger';
import { useCollisionDetection } from './useCollisionDetection';
import { DrawDotOnCanvasFn, DrawIncrementalPathFn } from './useCanvasDrawing';
import { canvasState } from 'src/util/canvas/state/CanvasState';

interface EraserManagerProps {
	canvasWidth: number;
	canvasHeight: number;
	drawDotOnCanvas: DrawDotOnCanvasFn;
	drawIncrementalPath: DrawIncrementalPathFn;
	collisionDetection: ReturnType<typeof useCollisionDetection>;
	clearCanvas: () => void;
	gridSize?: number;
	onStrokeErased?: (strokeId: string) => void;
}

export const useEraserManager = (eraserManagerProps: EraserManagerProps) => {
	const {
		drawDotOnCanvas,
		drawIncrementalPath,
		collisionDetection,
		clearCanvas,
	} = eraserManagerProps;

	const eraseWithInterpolatedPath = useCallback(
		(eraserInterpolatedPoints: EraserPoint[], eraserSize: number = 1) => {
			if (eraserInterpolatedPoints.length === 0) return [];

			// Collect all nearby packets from ALL eraser points
			const allNearbyPackets = new Map<string, Set<string>>();

			for (const eraserPoint of eraserInterpolatedPoints) {
				const nearbyPackets = canvasState.getPacketIdsNearPoint(eraserPoint);

				// Merge into allNearbyPackets
				nearbyPackets.forEach((packetIds, strokeId) => {
					if (!allNearbyPackets.has(strokeId)) {
						allNearbyPackets.set(strokeId, new Set());
					}
					packetIds.forEach((canvasMessageId) => {
						allNearbyPackets.get(strokeId)!.add(canvasMessageId);
					});
				});
			}

			logger.debug(
				'@ allNearbyPackets from all eraser points',
				Array.from(allNearbyPackets.entries()).map(([strokeId, packetIds]) => ({
					strokeId,
					packetIds: Array.from(packetIds),
				})),
			);

			if (allNearbyPackets.size === 0) return [];

			const erasedStrokeIds = new Set<string>();

			// Check each nearby stroke packet
			allNearbyPackets.forEach((packetIds, strokeId) => {
				// Skip if already erased
				if (canvasState.isStrokeErased(strokeId)) return;

				packetIds.forEach((canvasMessageId) => {
					// Get bbox for this specific packet
					const strokePacketBBox = canvasState.getStrokeBoundingBox(strokeId);

					if (!strokePacketBBox) {
						logger.warn(`@ No bbox found for ${strokeId}/${canvasMessageId}`);
						return;
					}

					// Check collision with interpolated eraser path
					const hasCollision =
						collisionDetection.isEraserPathCollidingWithPacket(
							eraserInterpolatedPoints,
							strokeId,
							canvasMessageId,
							strokePacketBBox,
							eraserSize / 2, // eraserRadius
						);

					if (hasCollision) {
						erasedStrokeIds.add(strokeId);
						logger.debug(
							`@ Collision detected for strokeId: ${strokeId}, canvasMessageId: ${canvasMessageId}`,
						);
					}
				});
			});

			// Mark strokes as erased and remove from grid
			erasedStrokeIds.forEach((strokeId) => {
				canvasState.markStrokeErased(strokeId);
				canvasState.removeStrokeFromGrid(strokeId);
			});

			if (erasedStrokeIds.size > 0) {
				redrawCanvas();
			}

			return Array.from(erasedStrokeIds);
		},
		[],
	);

	const eraseAtPoint = useCallback(
		(point: EraserPoint, eraserSize: number = 1) => {
			// Query spatial grid with single point
			const nearbyPackets = canvasState.getPacketIdsNearPoint(point);

			if (nearbyPackets.size === 0) return [];

			const erasedStrokeIds = new Set<string>();
			const eraserRadius = eraserSize / 2;

			// Check each nearby stroke packet
			nearbyPackets.forEach((packetIds, strokeId) => {
				// Skip if already erased
				if (canvasState.isStrokeErased(strokeId)) return;

				packetIds.forEach((canvasMessageId) => {
					// Get bbox for this specific packet
					const strokePacketBBox = canvasState.getStrokeBoundingBox(strokeId);

					if (!strokePacketBBox) {
						logger.warn(`@ No bbox found for ${strokeId}/${canvasMessageId}`);
						return;
					}

					// Quick bbox check for single point
					if (
						point.x < strokePacketBBox.minX - eraserRadius ||
						point.x > strokePacketBBox.maxX + eraserRadius ||
						point.y < strokePacketBBox.minY - eraserRadius ||
						point.y > strokePacketBBox.maxY + eraserRadius
					) {
						return; // Point not in bbox
					}

					// Get interpolated stroke points
					const strokeInterpolatedPoints =
						canvasState.getStrokeInterpolatedPoints(strokeId, canvasMessageId);

					const points = canvasState.getPacket(
						strokeId,
						canvasMessageId,
					).points;
					// Check collision with interpolated stroke points
					const hasCollision = collisionDetection.checkPointsCollision(
						point,
						!strokeInterpolatedPoints || strokeInterpolatedPoints.length === 0
							? (points as DrawingPoint[])
							: strokeInterpolatedPoints,
						eraserRadius,
					);

					if (hasCollision) {
						erasedStrokeIds.add(strokeId);
						logger.debug(
							`@ Single point collision detected for strokeId: ${strokeId}, canvasMessageId: ${canvasMessageId}`,
						);
					}
				});
			});

			logger.debug(
				'@ erasedStrokeIds from single point: ',
				Array.from(erasedStrokeIds),
			);

			// Mark strokes as erased and remove from grid
			erasedStrokeIds.forEach((strokeId) => {
				eraseStroke(strokeId);
			});

			if (erasedStrokeIds.size > 0) {
				redrawCanvas();
			}

			return Array.from(erasedStrokeIds);
		},
		[collisionDetection],
	);

	const eraseStroke = (strokeId: string) => {
		canvasState.markStrokeErased(strokeId);
		canvasState.removeStrokeFromGrid(strokeId);
	};

	const redrawCanvas = () => {
		clearCanvas();
		const allNonErasedPackets = canvasState.getAllNonErasedDrawingPackets();
		logger.debug('allNonErasedPackets', allNonErasedPackets);

		allNonErasedPackets.forEach((packet) => {
			const previousPacket = canvasState.getPreviousPacket(packet);
			drawIncrementalPath(previousPacket, packet);
		});
	};

	return {
		eraseStroke,
		eraseWithInterpolatedPath,
		eraseAtPoint,
		redrawCanvas,
	};
};
