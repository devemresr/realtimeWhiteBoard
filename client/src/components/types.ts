import { JSX } from 'react';

export type CanvasBarKeys =
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
export type CanvasBarItem = {
	key: CanvasBarKeys;
	icon: JSX.Element;
	trigger?: () => void;
};

export type CanvasShapeKeys = 'square' | 'triangle' | 'circle' | 'star';

export type CanvasSideBarProps = {
	selectedElement: CanvasBarKeys;
	brushColor: string;
	setBrushColor: React.Dispatch<React.SetStateAction<string>>;
	brushSize: number;
	setBrushSize: React.Dispatch<React.SetStateAction<number>>;
	brushShape: string;
	setBrushShape: React.Dispatch<React.SetStateAction<string>>;
	textStyle: {
		size: string;
		design: string;
	};
	setTextStyle: React.Dispatch<
		React.SetStateAction<{
			size: string;
			design: string;
		}>
	>;
};
