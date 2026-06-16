import { useEffect } from 'react';
import { IoArrowUndoOutline } from 'react-icons/io5';
import { IoArrowRedoOutline } from 'react-icons/io5';
export default function HistoryArrows() {
	const undoActive = true;
	const redoActive = true;
	const handleUndo = () => {}; //todo history undo redo
	const handleRedo = () => {};
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!(e.ctrlKey || e.metaKey)) return;

			switch (e.key.toLowerCase()) {
				case 'z':
					handleUndo();
					break;
				case 'y':
					handleRedo();
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);
	return (
		<div className='flex flex-row items-center justify-center mx-2 gap-2'>
			<button
				disabled={!undoActive}
				className={`text-gray-700 hover:text-gray-900 disabled:text-gray-300`}
				onClick={handleUndo}
			>
				<IoArrowUndoOutline size={22} />
			</button>
			<button
				disabled={!redoActive}
				className={`text-gray-700 hover:text-gray-900 disabled:text-gray-300`}
				onClick={handleRedo}
			>
				<IoArrowRedoOutline size={22} />
			</button>
		</div>
	);
}
