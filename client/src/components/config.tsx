import {
	BoldSVG,
	CircleSVG,
	EraserSVG,
	HandSVG,
	ImageSVG,
	ItalicSVG,
	LineSVG,
	PaintSVG,
	PenSVG,
	PointerSVG,
	SquareSVG,
	StarSVG,
	TextSVG,
	TrashSVG,
	TriangleSVG,
	UnderlineSVG,
} from '../constants/svgs';
import { CanvasBarItem } from './types';

export const brushSizeConfig = [
	{ key: 'small', size: 2, height: 1 },
	{ key: 'medium', size: 8, height: 2 },
	{ key: 'large', size: 20, height: 4 },
	{ key: 'xl', size: 32, height: 6 },
];
const color = '#2f2f2f';
export const brushShapeConfig = [
	{
		shape: 'square',
		icon: <SquareSVG color={color} />,
	},
	{
		shape: 'triangle',
		icon: <TriangleSVG color={color} />,
	},
	{
		shape: 'circle',
		icon: <CircleSVG color={color} />,
	},
	{
		shape: 'star',
		icon: <StarSVG color={color} />,
	},
];
export const textSizeConfig = [
	{ key: 'smallT', iconSize: 10, fontSize: 14 },
	{ key: 'mediumT', iconSize: 14, fontSize: 18 },
	{ key: 'bigT', iconSize: 16, fontSize: 22 },
];

export const textDesignConfig = [
	{ key: 'default', icon: <TextSVG color={color} /> },
	{ key: 'italic', icon: <ItalicSVG color={color} /> },
	{ key: 'underline', icon: <UnderlineSVG color={color} /> },
	{ key: 'bold', icon: <BoldSVG color={color} /> },
];

export const canvasBarItems: CanvasBarItem[] = [
	{
		key: 'drag',
		icon: <HandSVG color={color} />,
		cursor: 'cursor-arrows',
	},
	{ key: 'pointer', icon: <PointerSVG color={color} /> },
	{
		key: 'draw',
		icon: <PenSVG color={color} />,
		cursor: 'cursor-crosshair',
	},
	{
		key: 'paint',
		icon: <PaintSVG color={color} />,
		cursor: 'cursor-paint-bucket',
	},
	{
		key: 'erase',
		icon: <EraserSVG color={color} />,
		cursor: 'cursor-circle',
	},
	{ key: 'shape', icon: <StarSVG color={color} />, cursor: 'cursor-circle' },
	{
		key: 'text',
		icon: <TextSVG color={color} />,
		cursor: 'cursor-text',
	},
	{ key: 'line', icon: <LineSVG color={color} /> },
	{
		key: 'image',
		icon: <ImageSVG color={color} />,
		cursor: 'cursor-circle',
	},
	{ key: 'clear', icon: <TrashSVG color={color} /> },
];

export const cursors = {
	'cursor-default': "url('/cursor-default.svg') 2 2",
	'cursor-arrows': "url('/cursor-arrows.svg') 13 13",
	'cursor-circle': "url('/cursor-circle.svg') 11 11",
	'cursor-crosshair': "url('/cursor-crosshair.svg') 13 13",
	'cursor-eye-dropper': "url('/cursor-eye-dropper.svg') 13 13",
	'cursor-hand-grabbing': "url('/cursor-hand-grabbing.svg') 8 0",
	'cursor-hand-pointing': "url('/cursor-hand-pointing.svg') 8 0",
	'cursor-text': "url('/cursor-text.svg') 13 13",
	'cursor-paint-bucket': "url('/cursor-paint-bucket.svg') 3 24",
};
export type CursorType = keyof typeof cursors;
