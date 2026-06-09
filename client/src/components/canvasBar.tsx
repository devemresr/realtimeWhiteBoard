import { useCallback, useEffect, useRef, useState } from 'react';
import { canvasBarItems } from './config';
import { ToastContainer, toast } from 'react-toastify';
export default function CanvasBar({
	setSelectedElement,
	selectedElement,
	clearCanvas,
	isLogging,
	setIsLogging,
}) {
	const items = canvasBarItems;
	const notify = () => toast('Wow so easy !');
	const handlers = { clear: clearCanvas };
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const key = e.key;
			if (key >= '1' && key <= '9') {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
					timeoutRef.current = null;
				}
				const index = parseInt(key, 10) - 1;
				if (items[index]) {
					const selectedKey = items[index].key;
					setSelectedElement(selectedKey);
					if (handlers[selectedKey]) {
						handlers[selectedKey]();
					}
				}
				return;
			} else if (key === '0') {
				const lastIndex = items.length - 1;
				if (items[lastIndex]) {
					const selectedKey = items[lastIndex].key;
					setSelectedElement(selectedKey);
					handlers[selectedKey]();
					timeoutRef.current = setTimeout(() => {
						setSelectedElement('pointer');
						timeoutRef.current = null;
					}, 250);
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [items, setSelectedElement]);

	return (
		<div className='container bg-white max-w-max border rounded-lg border-gray-200 p-1 fixed shadow left-1/2 -translate-x-1/2 top-2 flex gap-1'>
			<div className=''>
				<button onClick={notify}>Notify !</button> {/*notif example */}
				<ToastContainer />
			</div>
			{items.map((item, index) => {
				const handleElementSelection = () => {
					const selectedKey = item.key;
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
						timeoutRef.current = null;
					}
					setSelectedElement(selectedKey);
					if (handlers[selectedKey]) {
						handlers[selectedKey]();
					}
					if (selectedKey === 'clear') {
						timeoutRef.current = setTimeout(() => {
							setSelectedElement('pointer');
							timeoutRef.current = null;
						}, 250);
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
