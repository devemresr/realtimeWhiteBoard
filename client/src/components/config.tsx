import {
	BoldSVG,
	CircleSVG,
	ItalicSVG,
	SquareSVG,
	StarSVG,
	TextSVG,
	TriangleSVG,
	UnderlineSVG,
} from '../constants/svgs';

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
