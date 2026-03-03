/**
 * Standard interface for all canvas tool handlers
 * Each tool should implement these methods to handle pointer interactions
 */
export interface ToolHandlers {
	/**
	 * Called when pointer interaction starts (pointerdown)
	 * @param e - React pointer event from canvas
	 */
	startInteraction?: (e: React.PointerEvent<HTMLCanvasElement>) => void;

	/**
	 * Called during pointer movement (pointermove)
	 * @param e - React pointer event from canvas
	 */
	continueInteraction?: (e: React.PointerEvent<HTMLCanvasElement>) => void;

	/**
	 * Called when pointer interaction ends (pointerup)
	 */
	endInteraction?: () => void;

	/**
	 * Optional: Called when pointer leaves canvas (pointerleave)
	 */
	cancelInteraction?: () => void;
}

/**
 * Configuration for canvas toolbar items
 */
export interface CanvasBarItem {
	key: string;
	icon: React.ReactNode;
	handler?: () => void; // For immediate action tools like clear, undo
	tooltip?: string;
	disabled?: boolean;
}

/**
 * Tool types available in the canvas
 */
export type ToolType =
	| 'drag'
	| 'pointer'
	| 'draw'
	| 'paint'
	| 'erase'
	| 'shape'
	| 'text'
	| 'line'
	| 'image'
	| 'clear';

/**
 * Map of tool types to their handlers
 */
export type ToolHandlersMap = Record<ToolType, ToolHandlers>;
