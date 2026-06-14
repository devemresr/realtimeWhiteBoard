import { useRef, useCallback, useEffect } from 'react';

interface BrushOptions {
	brushColor: string;
	brushSize: number;
}

/**
 * Owns the 2D rendering context and keeps its stroke/fill props
 * in sync with brushOptions without triggering re-renders.
 *
 * Separated from drawing logic so the ctx ref can be shared
 * across local and broadcast drawing paths via context.
 */
export const useCanvasCtxSetup = (canvasRef, brushOptions: BrushOptions) => {
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

	// Tracks last-applied brush values so we only write to ctx when something changed.
	// Writing ctx props on every draw call is wasteful.
	const contextPropsRef = useRef({ brushColor: null, brushSize: null });

	const { brushColor, brushSize } = brushOptions;

	useEffect(() => {
		if (!canvasRef.current || ctxRef.current) return;
		const ctx = canvasRef.current.getContext('2d');
		if (!ctx) return;

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctxRef.current = ctx;
	}, []);

	/**
	 * Lazily syncs brush color and size to the ctx.
	 * Call at the top of any draw function before issuing draw commands.
	 */
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

	return { ctxRef, updateContextProps };
};
