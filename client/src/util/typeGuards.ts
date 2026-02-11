import { BasePoint, DrawingPoint, EraserPoint } from '@/types';

export const hasDrawingProps = (point: BasePoint): point is DrawingPoint => {
	return 'brushColor' in point && 'brushSize' in point;
};

export const hasBrushSize = (
	point: BasePoint,
): point is { brushSize: number } & BasePoint => {
	return 'brushSize' in point;
};

export const hasEraserProps = (point: BasePoint): point is EraserPoint => {
	return 'brushSize' in point && !('brushColor' in point);
};
