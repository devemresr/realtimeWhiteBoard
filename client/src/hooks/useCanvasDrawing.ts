import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Point } from '../app/types_interfaces/DrawingTypes';

const useCanvasDrawing = (canvasRef, brushColor, brushSize) => {
	const requestRef = useRef(null);
	const lastBroadcastPoint = useRef(null);
	const MAXGAP = 5;
	const SKIP_INTERPOLATION_THRESHOLD = 2;
	const ctxRef = useRef(null);
	const contextPropsRef = useRef({ brushColor: null, brushSize: null });

	// Memoize the interpolation function to avoid recreation
	const smartInterpolation = useMemo(() => {
		return (points: Point[], maxGap: number) => {
			if (points.length < 2) return points;

			const result = [points[0]];

			for (let i = 1; i < points.length; i++) {
				const prev = points[i - 1];
				const currentPoint = points[i];
				const distance = Math.sqrt(
					(currentPoint.x - prev.x) ** 2 + (currentPoint.y - prev.y) ** 2
				);

				if (distance <= maxGap) {
					result.push(currentPoint);
					continue;
				}

				// For only large gaps use interpolation
				const numInterpolated = Math.ceil(distance / maxGap);

				// Determine curve direction from context
				let controlOffset = { x: 0, y: 0 };

				if (i >= 2) {
					const prevPrev = points[i - 2];
					const direction = {
						x: prev.x - prevPrev.x,
						y: prev.y - prevPrev.y,
					};
					controlOffset = {
						x: direction.x * 0.3,
						y: direction.y * 0.3,
					};
				} else if (i < points.length - 1) {
					const next = points[i + 1];
					const direction = {
						x: next.x - currentPoint.x,
						y: next.y - currentPoint.y,
					};
					controlOffset = {
						x: -direction.x * 0.3,
						y: -direction.y * 0.3,
					};
				}

				// Generate smooth interpolated points using quadratic curve
				for (let j = 1; j <= numInterpolated; j++) {
					const t = j / numInterpolated;

					const controlPoint = {
						x: (prev.x + currentPoint.x) / 2 + controlOffset.x,
						y: (prev.y + currentPoint.y) / 2 + controlOffset.y,
					};

					const interpolatedPoint = {
						x:
							(1 - t) * (1 - t) * prev.x +
							2 * (1 - t) * t * controlPoint.x +
							t * t * currentPoint.x,
						y:
							(1 - t) * (1 - t) * prev.y +
							2 * (1 - t) * t * controlPoint.y +
							t * t * currentPoint.y,
					};

					result.push(interpolatedPoint);
				}
			}

			return result;
		};
	}, []);

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
			ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
			ctx.fillStyle = brushColor;
			ctx.fill();
		},
		[brushSize, brushColor, updateContextProps]
	);

	const drawPathOnCanvas = useCallback(
		(points: Point[]) => {
			if (!ctxRef.current) return;

			if (points.length <= SKIP_INTERPOLATION_THRESHOLD) {
				// todo decide what to do with exactly 2 points currently
				drawDotOnCanvas(points[0]);
				return;
			}

			const ctx = ctxRef.current;
			// Update context properties only if changed // todo search if this is possible with usecontext
			updateContextProps();

			const skipInterpolation: boolean =
				points.length < SKIP_INTERPOLATION_THRESHOLD ? true : false;
			const finalPoints = skipInterpolation
				? points
				: smartInterpolation(points, MAXGAP);

			ctx.beginPath();
			ctx.moveTo(finalPoints[0].x, finalPoints[0].y);

			for (let i = 1; i < finalPoints.length - 1; i++) {
				const current = finalPoints[i];
				const next = finalPoints[i + 1];
				const controlX = (current.x + next.x) / 2;
				const controlY = (current.y + next.y) / 2;
				ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
			}

			ctx.stroke();
		},
		[smartInterpolation, updateContextProps]
	);

	const drawBroadcastPath = useCallback(
		(points: Point[], isFirstPackage: boolean, isLastPackage: boolean) => {
			if (points?.length === 0) return;

			const standalonePackage = isFirstPackage && isLastPackage;
			let drawPoints: Point[];

			if (isFirstPackage && !standalonePackage) {
				drawPoints = points;
				lastBroadcastPoint.current = points[points.length - 1];
			} else if (standalonePackage) {
				drawPoints = points;
				lastBroadcastPoint.current = null;
			} else if (isLastPackage) {
				if (lastBroadcastPoint.current) {
					const firstPoint = points[0];
					const lastPoint = lastBroadcastPoint.current;
					const distance = Math.sqrt(
						(firstPoint.x - lastPoint.x) ** 2 +
							(firstPoint.y - lastPoint.y) ** 2
					);

					if (distance < 1) {
						drawPoints = [lastBroadcastPoint.current, ...points.slice(1)];
					} else {
						drawPoints = [lastBroadcastPoint.current, ...points];
					}
				} else {
					drawPoints = points;
				}
				lastBroadcastPoint.current = null;
			} else {
				drawPoints = lastBroadcastPoint.current
					? [lastBroadcastPoint.current, ...points]
					: points;
				lastBroadcastPoint.current = points[points.length - 1];
			}
			drawPathOnCanvas(drawPoints);
		},
		[drawPathOnCanvas]
	);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}, []);

	useEffect(() => {
		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, []);

	return {
		requestRef,
		drawPathOnCanvas,
		drawBroadcastPath,
		clearCanvas,
		drawDotOnCanvas,
	};
};

export default useCanvasDrawing;
