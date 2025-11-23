import { useRef } from 'react';
import { ColorPickerSVG, TextSVG } from '../../constants/svgs';
import CanvasColorBlock from './canvasColorBlock';
import { CanvasSideBarProps } from '../types';
import {
	brushShapeConfig,
	brushSizeConfig,
	textDesignConfig,
	textSizeConfig,
} from '../config';

export default function CanvasSideBar({
	selectedElement,
	brushColor,
	setBrushColor,
	brushSize,
	setBrushSize,
	brushShape,
	setBrushShape,
	textStyle,
	setTextStyle,
}: CanvasSideBarProps) {
	const colorInputRef = useRef<HTMLInputElement>(null);

	const handleButtonClick = () => {
		colorInputRef.current?.click();
	};
	const activeTools = ['draw', 'line', 'shape', 'text', 'paint'];
	if (!activeTools.includes(selectedElement)) {
		return null;
	}
	return (
		<div
			style={{ width: 160 }}
			className='container fixed left-2 top-24 bg-white border rounded-lg border-gray-200 py-4 px-2 shadow flex flex-col gap-1'
		>
			<div className='relative flex flex-row gap-1 items-center justify-center mx-auto'>
				<CanvasColorBlock setBrushColor={setBrushColor} />
				<span className='h-7 bg-gray-200 mx-1' style={{ width: 1 }} />
				<button
					onClick={handleButtonClick}
					style={{ backgroundColor: brushColor }}
					className='w-7 h-7 bg-black p-1 flex items-center justify-center rounded cursor-pointer'
				>
					<ColorPickerSVG color='white' />
				</button>
				<input
					type='color'
					ref={colorInputRef}
					value={brushColor}
					onChange={(e) => setBrushColor(e.target.value)}
					className='absolute opacity-0'
					style={{ width: 1, height: 1 }}
				/>
			</div>
			{(selectedElement === 'draw' || selectedElement === 'line') && (
				<>
					<span className='w-m bg-gray-100 my-1' style={{ height: 1 }} />
					<div className='relative flex flex-row gap-1 justify-between'>
						{brushSizeConfig.map((e) => (
							<button
								key={e.key}
								onClick={() => setBrushSize(e.size)}
								className={`w-7 h-7 flex bg-gray-200 items-center justify-center rounded transition-colors
          ${brushSize === e.size ? 'bg-purple-100' : 'hover:bg-purple-50'}
        `}
							>
								<div
									style={{ height: e.height }}
									className='w-4 bg-black rounded'
								/>
							</button>
						))}
					</div>
				</>
			)}
			{selectedElement === 'shape' && (
				<>
					<span className='w-m bg-gray-100 my-1' style={{ height: 1 }} />
					<div className='relative flex flex-row gap-1 justify-between'>
						{brushShapeConfig.map((e) => (
							<button
								key={e.shape}
								onClick={() => setBrushShape(e.shape)}
								className={`w-7 h-7 flex p-1 bg-gray-200 items-center justify-center rounded transition-colors
          ${brushShape === e.shape ? 'bg-purple-100' : 'hover:bg-purple-50'}
        `}
							>
								{e.icon}
							</button>
						))}
					</div>
				</>
			)}
			{selectedElement === 'text' && (
				<>
					<span className='w-m bg-gray-100 my-1' style={{ height: 1 }} />
					<div className='relative flex flex-row gap-1 justify-evenly'>
						{textSizeConfig.map((e) => {
							const color = '#2f2f2f';
							return (
								<button
									key={e.key}
									onClick={() =>
										setTextStyle((prev) => ({
											...prev,
											size: e.key,
										}))
									}
									className={`w-7 h-7 flex p-1 bg-gray-200 items-center justify-center rounded transition-colors
          ${textStyle.size === e.key ? 'bg-purple-100' : 'hover:bg-purple-50'}
        `}
								>
									<TextSVG props={{ width: e.iconSize }} color={color} />
								</button>
							);
						})}
					</div>
					<span className='w-m bg-gray-100 my-1' style={{ height: 1 }} />
					<div className='relative flex flex-row gap-1 justify-evenly'>
						{textDesignConfig.map((e) => {
							return (
								<button
									key={e.key}
									onClick={() =>
										setTextStyle((prev) => ({
											...prev,
											design: e.key,
										}))
									}
									className={`w-7 h-7 flex p-1.5 bg-gray-200 items-center justify-center rounded transition-colors
          ${textStyle.design === e.key ? 'bg-purple-100' : 'hover:bg-purple-50'}
        `}
								>
									{e.icon}
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
