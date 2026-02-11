import { useCallback } from 'react';
import { CanvasPoint, DrawingPoint, EraserPoint, PacketType } from '@/types';
import logger from '../../../util/logger';
import { useCollisionDetection } from '../../useCollisionDetection';
import { useCanvasState } from '../state/useCanvasState';
import { DrawDotOnCanvasFn, DrawIncrementalPathFn } from './useCanvasDrawing';

interface EraserManagerProps {
	canvasWidth: number;
	canvasHeight: number;
	canvasState: ReturnType<typeof useCanvasState>;
	getStrokeIdsNearPoint: (point: EraserPoint) => string[];
	drawDotOnCanvas: DrawDotOnCanvasFn;
	drawIncrementalPath: DrawIncrementalPathFn;
	getStrokeBoundingBox: any;
	collisionDetection: ReturnType<typeof useCollisionDetection>;
	clearCanvas: () => void;
	gridSize?: number;
	onStrokeErased?: (strokeId: string) => void;
}

export const useEraserManager = (eraserManagerProps: EraserManagerProps) => {
	const {
		getStrokeIdsNearPoint,
		drawDotOnCanvas,
		drawIncrementalPath,
		collisionDetection,
		canvasState,
		clearCanvas,
	} = eraserManagerProps;
	const {
		getAllPacketsForAnAction,
		getStrokeBoundingBox,
		markStrokeErased,
		removeStrokeFromGrid,
		getAllNonErasedDrawingPackets,
	} = canvasState;

	const eraseAtPoint = useCallback(
		(point: EraserPoint, eraserSize: number = 1) => {
			// Get nearby strokes from spatial grid
			const nearbyStrokeIds = getStrokeIdsNearPoint(point);
			logger.debug('@ nearbyStrokeIds in eraserManager', nearbyStrokeIds);
			if (!nearbyStrokeIds.length) return;

			const erasedStrokeIds: string[] = [];

			nearbyStrokeIds.forEach((strokeId) => {
				const strokePackets = getAllPacketsForAnAction(strokeId);
				const strokeBoundingBox = getStrokeBoundingBox(strokeId);
				logger.debug(
					'nearby strokes strokeId: ',
					strokeId,
					'the packets: ',
					strokePackets,
					'the boundingbox: ',
					strokeBoundingBox,
				);

				if (!strokePackets || strokePackets[0].isErased) return;

				// Check collision
				strokePackets.forEach((strokePacket) => {
					if (
						strokePacket.type === PacketType.DRAWING &&
						collisionDetection.isPointNearStroke(
							point,
							strokePacket,
							strokeBoundingBox,
							eraserSize,
						)
					) {
						erasedStrokeIds.push(strokeId);
						logger.debug(
							'collision detected for the strokeId:',
							strokePacket.strokeId,
						);
					}
				});
			});
			logger.debug('erasedStrokeIds: ', erasedStrokeIds);
			erasedStrokeIds.forEach((strokeId) => {
				// Mark as erased
				markStrokeErased(strokeId);
				// Remove from spatial index
				removeStrokeFromGrid(strokeId);
			});
			if (erasedStrokeIds.length > 0) {
				logger.debug('allpackets: ', canvasState.getAllPackets());
				redrawCanvas();
			}
		},
		[
			getStrokeIdsNearPoint,
			getStrokeBoundingBox,
			removeStrokeFromGrid,
			getAllPacketsForAnAction,
		],
	);

	const redrawCanvas = () => {
		// todo optimize
		clearCanvas();
		const allNonErasedPackets = getAllNonErasedDrawingPackets();
		logger.debug('allNonErasedPackets', allNonErasedPackets);
		allNonErasedPackets.forEach((packet) => {
			logger.debug('test packet inredrawcanvas: ', packet);
			const previousPacket = canvasState.getPreviousPacket(packet);
			if (packet.packetSequenceNumber === 1) {
				drawDotOnCanvas(packet.points[0], PacketType.DRAWING);
			} else {
				drawIncrementalPath(previousPacket, packet);
			}
		});
	};

	return {
		eraseAtPoint,
	};
};
