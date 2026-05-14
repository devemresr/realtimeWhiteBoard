'use client';

import { useRef, useCallback, useEffect } from 'react';
import {
	BasePoint,
	CanvasPoint,
	DrawingPoint,
	EraserPoint,
	CanvasOperation,
	CanvasOperationType,
	CanvasOperationTypeToPoints,
} from '@/types';
import createInterpolator from '../../../util/drawing/interpolation';
import logger from '../../../util/logger';

export type DrawIncrementalPathFn = <T extends CanvasOperation>(
	previousPacket: T,
	currentPacket: T,
) => { interpolatedPoints: CanvasPoint[]; didInterpolated: boolean };

interface BrushOptions {
	brushColor: string;
	brushSize: number;
}

export type GetEnrichedInterpolatedPointsFn = <
	TType extends CanvasOperationType,
	TPacket extends CanvasOperation & { type: TType },
>(
	previousPacket: TPacket,
	currentPacket: TPacket,
) => CanvasOperationTypeToPoints[TType][];

export type DrawDotOnCanvasFn = (
	point: CanvasPoint,
	type: CanvasOperationType,
) => void;
export type DrawPointsFn = (
	points: CanvasPoint[],
	type: CanvasOperationType,
	brushColorOverride?: string,
	brushSizeOverride?: number,
) => void;
const useCanvasDrawing = (canvasRef, brushOptions: BrushOptions) => {
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const contextPropsRef = useRef({ brushColor: null, brushSize: null });
	const interpolator = createInterpolator({
		maxGap: 5,
	});
	const { brushColor, brushSize } = brushOptions;

	const setupContext = useCallback(() => {
		if (!canvasRef.current || ctxRef.current) return;
		const ctx = canvasRef.current.getContext('2d');
		if (!ctx) return;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctxRef.current = ctx;
	}, []);

	useEffect(() => {
		setupContext();
	}, [setupContext]);

	const updateContextProps = useCallback(() => {
		if (
			ctxRef.current &&
			(contextPropsRef.current.brushColor !== brushColor ||
				contextPropsRef.current.brushSize !== brushSize)
		) {
			ctxRef.current.strokeStyle = brushColor;
			ctxRef.current.lineWidth = brushSize;
			contextPropsRef.current.brushColor = brushColor;
			contextPropsRef.current.brushSize = brushSize;
		}
	}, [brushColor, brushSize]);

	const drawDotOnCanvas: DrawDotOnCanvasFn = useCallback(
		(point, type) => {
			if (!ctxRef.current) return;
			const ctx = ctxRef.current;
			updateContextProps();

			// Determine properties based on point type
			let pointBrushColor: string;
			let pointBrushSize: number;

			switch (type) {
				case CanvasOperationType.DRAWING:
					const firstPoint = point as DrawingPoint;
					pointBrushColor = firstPoint.brushColor;
					pointBrushSize = firstPoint.brushSize;
					break;
				case CanvasOperationType.ERASER:
					pointBrushColor = brushColor; // Use default for eraser
					pointBrushSize = (point as EraserPoint).brushSize;
					break;
			}

			ctx.beginPath();
			ctx.strokeStyle = pointBrushColor;
			ctx.lineWidth = pointBrushSize;
			ctx.arc(point.x, point.y, pointBrushSize / 2, 0, Math.PI * 2);
			ctx.fillStyle = pointBrushColor;
			ctx.fill();
		},
		[brushSize, brushColor, updateContextProps],
	);

	const getInterpolatedPoints = (
		contextPoints: BasePoint[],
		toBeDrawnPoints: BasePoint[],
	): BasePoint[] => {
		const interpolated = interpolator.interpolate([
			...contextPoints,
			...toBeDrawnPoints,
		]);

		return interpolated;
	};

	const drawPoints = useCallback(
		(
			points: CanvasPoint[],
			type: CanvasOperationType,
			brushColorOverride?: string,
			brushSizeOverride?: number,
		) => {
			if (!ctxRef.current || points.length === 0) return;

			const ctx = ctxRef.current;
			updateContextProps();

			// Determine brush properties based on point type
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
					return [];
			}

			ctx.strokeStyle = pointBrushColor;
			ctx.lineWidth = pointBrushSize;

			// Single dot case
			if (points.length === 1) {
				drawDotOnCanvas(points[0], type);
				return;
			}

			// Draw path
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);

			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}

			ctx.stroke();
		},
		[updateContextProps, drawDotOnCanvas, brushColor, brushSize],
	);

	/**
	 * Enriches interpolated base points with tool-specific properties.
	 *
	 * Supports multiple point types for different canvas tools:
	 * - DrawingPoint: Regular brush strokes (brushColor, brushSize)
	 * - EraserPoint: Eraser strokes (brushSize only)
	 * - LassoPoint: Selection path points (selectionId, isComplete)
	 * - TransformPoint: Dragged/moved stroke points (deltaX, deltaY, transformId)
	 * - ShapePoint: Geometric shapes (shapeType, shape params)
	 *
	 * @param contextPoints - Previous points for smooth interpolation
	 * @param toBeDrawnPoints - New points to be interpolated and enriched
	 * @returns Interpolated points with tool-specific properties preserved
	 */
	const enrichInterpolatedPoints = <TPoint extends CanvasPoint>(
		interpolatedPoints: BasePoint[],
		pointToExtractProperities: TPoint,
	): TPoint[] => {
		if (interpolatedPoints.length === 0) return [];

		// Extract all properties except x, y from the first point
		const { x, y, timestamp, ...additionalProps } = pointToExtractProperities;

		return interpolatedPoints.map((point) => ({
			...point,
			...additionalProps,
		})) as TPoint[];
	};

	/**
	 * Gets interpolated points and enriches them with tool-specific properties.
	 * Does not draw to canvas.
	 *
	 * @param previousPacket - Previous packet for smooth interpolation
	 * @param currentPacket - Current packet to be interpolated and enriched
	 * @returns Enriched interpolated points ready for drawing
	 */

	const getEnrichedInterpolatedPoints = <
		TType extends CanvasOperationType,
		TPacket extends CanvasOperation & { type: TType },
	>(
		previousPacket: TPacket,
		currentPacket: TPacket,
	): CanvasOperationTypeToPoints[TType][] => {
		if (
			!currentPacket ||
			currentPacket?.points.length === 0 ||
			!previousPacket ||
			previousPacket?.points.length === 0
		) {
			return [];
		}
		const baseInterpolatedPoints = getInterpolatedPoints(
			previousPacket.points,
			currentPacket.points,
		);

		const pointToExtractProperities = currentPacket.points[0];

		const interpolatedPoints = enrichInterpolatedPoints(
			baseInterpolatedPoints,
			pointToExtractProperities,
		);

		return interpolatedPoints as CanvasOperationTypeToPoints[TType][];
	};

	/**
	 * Gets enriched interpolated points and draws them to canvas.
	 * Combines interpolation, enrichment, and drawing in one operation.
	 *
	 * @param previousPacket - Previous packet for smooth interpolation
	 * @param currentPacket - Current packet to be interpolated, enriched, and drawn
	 * @returns Enriched interpolated points that were drawn
	 */
	const drawIncrementalPath: DrawIncrementalPathFn = (
		previousPacket,
		currentPacket,
	) => {
		let interpolatedPoints = getEnrichedInterpolatedPoints(
			previousPacket,
			currentPacket,
		);
		const didInterpolated =
			interpolatedPoints.length !== 0 &&
			previousPacket?.points.length + currentPacket?.points.length !==
				interpolatedPoints.length;

		logger.debug(
			// 'interpolatedPoints:',
			// interpolatedPoints,
			'interpolatedPoints.length: ',
			interpolatedPoints.length,
			'previousPacket?.points.length: ',
			previousPacket?.points.length,
			// "previousPacket?.points",
			// previousPacket?.points,
			'currentPacket?.points.length: ',
			currentPacket?.points.length,
			// 'currentPacket?.points: ',
			// currentPacket?.points,
			'didInterpolated: ',
			didInterpolated,
		);

		const packetType = currentPacket?.type || previousPacket?.type;
		if (!didInterpolated)
			interpolatedPoints = [
				...(previousPacket?.points ?? []),
				...(currentPacket?.points ?? []),
			];

		drawPoints(interpolatedPoints, packetType);

		return { interpolatedPoints, didInterpolated };
	};

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		}
	}, []);

	return {
		clearCanvas,
		drawDotOnCanvas,
		getInterpolatedPoints,
		drawPoints,
		getEnrichedInterpolatedPoints,
		drawIncrementalPath,
	};
};

export default useCanvasDrawing;
