import { useCallback, useEffect, useRef, useState } from 'react';
import {
	EraserSVG,
	HandSVG,
	ImageSVG,
	LineSVG,
	PaintSVG,
	PenSVG,
	PointerSVG,
	StarSVG,
	TextSVG,
	TrashSVG,
} from '../constants/svgs';
import { CanvasBarItem } from './types';
import useMouseLog from '../hooks/debug/useMouseLog';

const color = '#2f2f2f';

export default function CanvasBar({
	setSelectedElement,
	selectedElement,
	clearCanvas,
	isLogging,
	setIsLogging,
}) {
	const canvasBarItems: CanvasBarItem[] = [
		{ key: 'drag', icon: <HandSVG color={color} /> },
		{ key: 'pointer', icon: <PointerSVG color={color} /> },
		{ key: 'draw', icon: <PenSVG color={color} /> },
		{ key: 'paint', icon: <PaintSVG color={color} /> },
		{ key: 'erase', icon: <EraserSVG color={color} /> },
		{ key: 'shape', icon: <StarSVG color={color} /> },
		{ key: 'text', icon: <TextSVG color={color} /> },
		{ key: 'line', icon: <LineSVG color={color} /> },
		{ key: 'image', icon: <ImageSVG color={color} /> },
		{ key: 'clear', icon: <TrashSVG color={color} />, trigger: clearCanvas },
	];
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const key = e.key;
			if (key >= '1' && key <= '9') {
				const index = parseInt(key, 10) - 1;
				if (canvasBarItems[index]) {
					setSelectedElement(canvasBarItems[index].key);
					if (canvasBarItems[index].trigger) {
						canvasBarItems[index].trigger();
					}
				}
				return;
			}
			if (key === '0') {
				const lastIndex = canvasBarItems.length - 1;
				if (canvasBarItems[lastIndex]) {
					setSelectedElement(canvasBarItems[lastIndex].key);
					canvasBarItems[lastIndex].trigger();
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [canvasBarItems, setSelectedElement]);

	return (
		<div className='container bg-white max-w-max border rounded-lg border-gray-200 p-1 fixed shadow left-1/2 -translate-x-1/2 top-2 flex gap-1'>
			{canvasBarItems.map((item, index) => {
				const handleElementSelection = () => {
					setSelectedElement(item.key);
					if (item.trigger) {
						item.trigger();
					}
				};
				return (
					<button
						key={item.key}
						onClick={handleElementSelection}
						className={`
          p-3 w-11 rounded relative transition-colors
          ${
						selectedElement === item.key
							? 'bg-purple-100'
							: 'hover:bg-purple-50'
					}
        `}
					>
						{item.icon}
						<p className='text-xs absolute bottom-0 right-1 text-gray-400'>
							{(index + 1) % 10}
						</p>
					</button>
				);
			})}
			<button onClick={() => setIsLogging(!isLogging)}>
				{isLogging ? 'press ESC to stop logging' : 'Start Logging'}
			</button>
		</div>
	);
}
