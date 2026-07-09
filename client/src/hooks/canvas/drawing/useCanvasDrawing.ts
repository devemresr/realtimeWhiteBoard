'use client';

import { useCallback, useEffect } from 'react';
import {
	CanvasPoint,
	DrawingPoint,
	EraserPoint,
	CanvasOperation,
	CanvasOperationType,
	CanvasOperationTypeToPoints,
} from '@/types';
import { useCanvasCtxSetup } from './useCanvasCtxSetup';
import {
	getInterpolatedPoints,
	enrichInterpolatedPoints,
} from '../../../util/canvas/drawing/canvasDrawingUtils';
import logger from 'src/util/logger';
import { canvasState } from 'src/util/canvas/state/CanvasState';

export type DrawIncrementalPathFn = <T extends CanvasOperation>(
	previousPacket: T,
	currentPacket: T,
) => { interpolatedPoints: CanvasPoint[]; didInterpolated: boolean };

export type DrawDotOnCanvasFn = (
	point: DrawingPoint,
	type: CanvasOperationType,
) => void;
export type DrawPointsFn = (
	points: CanvasPoint[],
	type: CanvasOperationType,
	brushColorOverride?: string,
	brushSizeOverride?: number,
) => void;

export interface BrushOptions {
	brushColor: string;
	brushSize: number;
}

const useCanvasDrawing = (canvasRef, brushOptions: BrushOptions) => {
	const { brushColor, brushSize } = brushOptions;
	const { ctxRef, updateContextProps } = useCanvasCtxSetup(
		canvasRef,
		brushOptions,
	);

	/**
	 * Draws a single filled circle at the given point.
	 * Used when a packet contains only one point (tap/click with no drag).
	 */
	const drawDotOnCanvas: DrawDotOnCanvasFn = useCallback(
		(point, type) => {
			if (!ctxRef.current) return;
			const ctx = ctxRef.current;
			updateContextProps();

			let pointBrushColor: string;
			let pointBrushSize: number;

			const firstPoint = point as DrawingPoint;
			pointBrushColor = firstPoint.brushColor;
			pointBrushSize = firstPoint.brushSize;

			ctx.beginPath();
			ctx.strokeStyle = pointBrushColor;
			ctx.lineWidth = pointBrushSize;
			ctx.arc(point.x, point.y, pointBrushSize / 2, 0, Math.PI * 2);
			ctx.fillStyle = pointBrushColor;
			ctx.fill();
		},
		[brushColor, updateContextProps],
	);

	/**
	 * Draws a sequence of points as a connected path.
	 * Falls back to drawDotOnCanvas for single-point packets.
	 * brushColor/Size overrides are used by the eraser and highlight tools.
	 */
	const drawPoints: DrawPointsFn = useCallback(
		(points, type, brushColorOverride?, brushSizeOverride?) => {
			if (!ctxRef.current || points.length === 0) return;

			const ctx = ctxRef.current;
			updateContextProps();

			let pointBrushColor: string;
			let pointBrushSize: number;

			switch (type) {
				case CanvasOperationType.DRAWING:
					const firstPoint = points[0] as DrawingPoint;
					pointBrushColor = brushColorOverride || firstPoint.brushColor;
					pointBrushSize = brushSizeOverride || firstPoint.brushSize;
					break;
				case CanvasOperationType.ERASER:
					pointBrushColor = brushColorOverride || brushColor;
					pointBrushSize =
						brushSizeOverride || (points[0] as EraserPoint).brushSize;
					break;
				default:
					return;
			}

			ctx.strokeStyle = pointBrushColor;
			ctx.lineWidth = pointBrushSize;

			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.stroke();
		},
		[updateContextProps, drawDotOnCanvas, brushColor],
	);

	/**
	 * Interpolates between two consecutive packets and enriches the resulting
	 * base points with tool metadata. Does not draw - pure data transformation.
	 *
	 * Supports:
	 * - DrawingPoint: brushColor, brushSize
	 * - EraserPoint: brushSize
	 * - LassoPoint: selectionId, isComplete
	 * - TransformPoint: deltaX, deltaY, transformId
	 * - ShapePoint: shapeType + shape params
	 */
	const getEnrichedInterpolatedPoints = useCallback(
		<
			TType extends CanvasOperationType,
			TPacket extends CanvasOperation & { type: TType },
		>(
			previousPacket: TPacket,
			currentPacket: TPacket,
		): CanvasOperationTypeToPoints[TType][] => {
			if (!currentPacket?.points.length || !previousPacket?.points.length)
				return [];

			const basePoints = getInterpolatedPoints(
				previousPacket.points,
				currentPacket.points,
			);
			const enriched = enrichInterpolatedPoints(
				basePoints,
				currentPacket.points[0],
			);

			return enriched as CanvasOperationTypeToPoints[TType][];
		},
		[],
	);

	/**
	 * Main draw call for incremental (packet-by-packet) rendering.
	 * Interpolates between previous and current packet for smooth curves,
	 * then draws the result. Falls back to raw points if interpolation
	 * adds nothing (e.g. packets are already adjacent).
	 */
	const drawIncrementalPath: DrawIncrementalPathFn = useCallback(
		(previousPacket, currentPacket) => {
			logger.debug('DRAWINCRE');
			if (currentPacket?.isLastPacket && currentPacket.points.length === 0) {
				return {
					interpolatedPoints: [],
					didInterpolated: false,
				};
			}
			const packetType = currentPacket?.type || previousPacket?.type;
			const isFirstPacket = !previousPacket;

			// Draw a dot at the first point of the stroke (covers startInteraction dot on redraw)
			if (isFirstPacket && currentPacket.type === CanvasOperationType.DRAWING) {
				logger.debug('first packet');
				drawDotOnCanvas(currentPacket.points[0] as DrawingPoint, packetType);
			}

			let interpolatedPoints = getEnrichedInterpolatedPoints(
				previousPacket,
				currentPacket,
			);

			logger.debug(
				{ previousPacket, currentPacket, interpolatedPoints },
				'before drawing',
			);

			const didInterpolated =
				interpolatedPoints.length !== 0 &&
				previousPacket?.points.length + currentPacket?.points.length !==
					interpolatedPoints.length;

			logger.debug(
				{
					interpolatedCount: interpolatedPoints.length,
					previousCount: previousPacket?.points.length,
					currentCount: currentPacket?.points.length,
					didInterpolated,
				},
				'drawIncrementalPath',
			);

			// If interpolation was a no-op, just draw the raw points from both packets
			if (!didInterpolated) {
				interpolatedPoints = [
					...(previousPacket?.points ?? []),
					...(currentPacket?.points ?? []),
				];
			}

			drawPoints(interpolatedPoints, packetType);

			return { interpolatedPoints, didInterpolated };
		},
		[getEnrichedInterpolatedPoints, drawPoints],
	);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		ctx?.clearRect(0, 0, canvas.width, canvas.height);
	}, []);

	const eraseAllStrokes = useCallback(() => {
		clearCanvas();
		const drawingActionIds = canvasState.getActionIdsByType(
			CanvasOperationType.DRAWING,
		);
		drawingActionIds.forEach((strokeId) => {
			canvasState.markStrokeErased(strokeId);
			canvasState.removeStrokeFromGrid(strokeId);
		});
	}, [clearCanvas]);

	return {
		eraseAllStrokes,
		clearCanvas,
		drawDotOnCanvas,
		drawPoints,
		getEnrichedInterpolatedPoints,
		drawIncrementalPath,
		ctxRef,
		updateContextProps,
	};
};

export default useCanvasDrawing;
