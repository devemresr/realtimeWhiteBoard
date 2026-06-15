import { useCallback } from 'react';
import { DrawingPoint, EraserPoint } from '@/types';
import logger from '../../../util/logger';
import { DrawIncrementalPathFn } from './useCanvasDrawing';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import { collisionDetection } from './CollisionDetection';

interface EraserManagerProps {
	drawIncrementalPath: DrawIncrementalPathFn;
	clearCanvas: () => void;
}

export type EraseWithInterpolatedPathFn = (
	eraserInterpolatedPoints: EraserPoint[],
	eraserSize?: number,
) => string[];

export type EraseAtPointFn = (
	point: EraserPoint,
	eraserSize?: number,
) => string[];

export type EraseStrokeFn = (strokeId: string) => void;
export type RedrawCanvasWithoutErasedStrokesFn = () => void;

export const useEraserManager = ({
	drawIncrementalPath,
	clearCanvas,
}: EraserManagerProps) => {
	const redrawCanvasWithoutErasedStrokes =
		useCallback<RedrawCanvasWithoutErasedStrokesFn>(() => {
			clearCanvas();
			const allNonErasedPackets = canvasState.getAllNonErasedDrawingPackets();
			logger.debug('allNonErasedPackets', allNonErasedPackets);

			allNonErasedPackets.forEach((packet) => {
				const previousPacket = canvasState.getPreviousPacket(packet);
				drawIncrementalPath(previousPacket, packet);
			});
		}, [clearCanvas, drawIncrementalPath]);

	const eraseStroke = useCallback<EraseStrokeFn>((strokeId: string) => {
		canvasState.markStrokeErased(strokeId);
		canvasState.removeStrokeFromGrid(strokeId);
	}, []);

	/**
	 * Erases strokes that collide with a dense interpolated eraser path.
	 *
	 * Use this for continuous eraser movement where multiple points have been
	 * accumulated since the last erase check. The full eraser path is tested
	 * against each nearby stroke packet in one pass, which is more efficient
	 * than calling eraseAtPoint for every individual point.
	 *
	 * @returns Array of stroke IDs that were erased
	 */
	const eraseWithInterpolatedPath = useCallback<EraseWithInterpolatedPathFn>(
		(
			eraserInterpolatedPoints: EraserPoint[],
			//todo pass the actaul eraserSize
			eraserSize: number = 1,
		): string[] => {
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
				'allNearbyPackets from all eraser points',
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
						logger.warn(`No bbox found for ${strokeId}/${canvasMessageId}`);
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
							`Collision detected for strokeId: ${strokeId}, canvasMessageId: ${canvasMessageId}`,
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
				redrawCanvasWithoutErasedStrokes();
			}

			return Array.from(erasedStrokeIds);
		},
		[redrawCanvasWithoutErasedStrokes],
	);

	/**
	 * Erases strokes that collide with a single eraser point.
	 *
	 * Use this for discrete tap/click erase events where there is no path to
	 * interpolate. Slightly cheaper than eraseWithInterpolatedPath since it
	 * skips the multi-point merge step.
	 *
	 * @returns Array of stroke IDs that were erased
	 */
	const eraseAtPoint = useCallback<EraseAtPointFn>(
		(point: EraserPoint, eraserSize: number = 1): string[] => {
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
						logger.warn(`No bbox found for ${strokeId}/${canvasMessageId}`);
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
							`Single point collision detected for strokeId: ${strokeId}, canvasMessageId: ${canvasMessageId}`,
						);
					}
				});
			});

			logger.debug(
				'erasedStrokeIds from single point: ',
				Array.from(erasedStrokeIds),
			);

			// Mark strokes as erased and remove from grid
			erasedStrokeIds.forEach((strokeId) => {
				eraseStroke(strokeId);
			});

			if (erasedStrokeIds.size > 0) {
				redrawCanvasWithoutErasedStrokes();
			}

			return Array.from(erasedStrokeIds);
		},
		[eraseStroke, redrawCanvasWithoutErasedStrokes],
	);

	return {
		eraseStroke,
		eraseWithInterpolatedPath,
		eraseAtPoint,
		redrawCanvasWithoutErasedStrokes,
	};
};
