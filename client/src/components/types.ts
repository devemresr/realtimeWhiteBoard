import { ToolType } from '@/types';
import { JSX } from 'react';
import { CursorType } from './config';

export type CanvasBarItem = {
	key: ToolType;
	icon: JSX.Element;
	handler?: () => void;
	cursor?: CursorType;
};

export type CanvasShapeKeys = 'square' | 'triangle' | 'circle' | 'star';

export type CanvasSideBarProps = {
	selectedElement: ToolType;
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
