type Point = {
	x: number;
	y: number;
	timestamp?: number;
};
type StrokeData = {
	roomId: string;
	strokes: Point[];
	strokeId: string;
	packageSequenceNumber: number;
	isLastPackage?: boolean;
	strokeSequenceNumber?: number;
};
export type { Point, StrokeData };
