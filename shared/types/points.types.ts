export interface BasePoint {
	x: number;
	y: number;
	timestamp?: number;
}

export interface DrawingPoint extends BasePoint {
	brushSize: number;
	brushColor: string;
}

export interface EraserPoint extends BasePoint {
	brushSize: number;
}

export interface LassoPoint extends BasePoint {
	// not implemented yet
}

export type CanvasPoint = EraserPoint | DrawingPoint | LassoPoint;
