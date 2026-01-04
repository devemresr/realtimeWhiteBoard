'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Point } from '@/types';
import createInterpolator from '../../../util/drawing/interpolation';
import logger from '../../../util/logger';

const useCanvasDrawing = (canvasRef, brushColor, brushSize) => {
	const requestRef = useRef(null);
	const ctxRef = useRef(null);
	const contextPropsRef = useRef({ brushColor: null, brushSize: null });
	const interpolator = createInterpolator({
		maxGap: 5, // max pixels till no interpolation
	});

	const setupContext = useCallback(() => {
		if (canvasRef.current && !ctxRef.current) {
			ctxRef.current = canvasRef.current.getContext('2d');
			ctxRef.current.imageSmoothingEnabled = true;
			ctxRef.current.imageSmoothingQuality = 'high';
			ctxRef.current.lineCap = 'round';
			ctxRef.current.lineJoin = 'round';
		}
	}, [canvasRef]);

	useEffect(() => {
		setupContext();
	}, [setupContext]);

	// Only update context properties when they actually change
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

	const drawDotOnCanvas = useCallback(
		(point: Point) => {
			if (!ctxRef.current) return;
			const ctx = ctxRef.current;
			updateContextProps();

			ctx.beginPath();
			const pointBrushColor = point.brushColor || brushColor;
			const pointBrushSize = point.brushSize || brushSize;
			ctxRef.current.strokeStyle = pointBrushColor;
			ctxRef.current.lineWidth = pointBrushSize;
			ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
			ctx.fillStyle = brushColor;
			ctx.fill();
		},
		[brushSize, brushColor, updateContextProps]
	);

	const drawIncrementalPath = useCallback(
		(contextPoints: Point[], toBeDrawnPoints: Point[]) => {
			if (!ctxRef.current || toBeDrawnPoints.length === 0) return;

			const ctx = ctxRef.current;
			updateContextProps();

			const pointBrushColor = toBeDrawnPoints[0].brushColor || brushColor;
			const pointBrushSize = toBeDrawnPoints[0].brushSize || brushSize;
			ctxRef.current.strokeStyle = pointBrushColor;
			ctxRef.current.lineWidth = pointBrushSize;

			if (toBeDrawnPoints.length === 1) {
				drawDotOnCanvas(toBeDrawnPoints[0]);
				return;
			}

			logger.debug(
				'received interpolation: contextPoints: ',
				JSON.stringify(contextPoints),
				'received interpolation segment: ',
				JSON.stringify(toBeDrawnPoints)
			);
			logger.debug(
				'before interpolation',
				JSON.stringify([...contextPoints, ...toBeDrawnPoints], null, 2)
			);
			const interpolated = interpolator.interpolate([
				...contextPoints,
				...toBeDrawnPoints,
			]);
			logger.debug(
				`after interpolation:`,
				JSON.stringify(interpolated, null, 2)
			);

			let startIndex = 0;

			if (startIndex >= interpolated.length) {
				console.log('Nothing new to draw after skip');
				return;
			}

			ctx.beginPath();
			ctx.moveTo(interpolated[startIndex].x, interpolated[startIndex].y);

			for (let i = startIndex + 1; i < interpolated.length; i++) {
				ctx.lineTo(interpolated[i].x, interpolated[i].y);
			}

			console.log(`Drew ${interpolated.length - startIndex} points`);
			ctx.stroke();
		},
		[interpolator, updateContextProps, drawDotOnCanvas]
	);

	// todo make an api call to server to flag everything as deleteddrawBroadcastPath,
	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}, []);

	// cleanup for rAF
	useEffect(() => {
		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, []);

	return {
		requestRef,
		clearCanvas,
		drawDotOnCanvas,
		drawIncrementalPath,
	};
};

export default useCanvasDrawing;
