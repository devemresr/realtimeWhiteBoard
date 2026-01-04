import { useCallback, useEffect, useRef, useState } from 'react';

const useMouseLog = () => {
	const [isLogging, setIsLogging] = useState(false);
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (isLogging && e.key === 'Escape') {
				setIsLogging(false);
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isLogging]);

	const updateMousePosition = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isLogging) return;

			const { offsetX, offsetY } = e.nativeEvent;
			setMousePos({ x: offsetX, y: offsetY });
		},
		[isLogging]
	);
	return { updateMousePosition, setIsLogging, isLogging, mousePos };
};

export default useMouseLog;
