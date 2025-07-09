import React, { useRef, useEffect, useState } from 'react';

export default function BasicBrushCanvas() {
	const canvasRef = useRef(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [brushSize, setBrushSize] = useState(5);
	const [brushColor, setBrushColor] = useState('#000000');

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	}, []);

	const startDrawing = (e) => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext('2d');

		setIsDrawing(true);
		ctx.beginPath();
		ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
	};

	const draw = (e) => {
		if (!isDrawing) return;

		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext('2d');

		ctx.lineWidth = brushSize;
		ctx.strokeStyle = brushColor;
		ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
		ctx.stroke();
	};

	const stopDrawing = () => {
		setIsDrawing(false);
	};

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	return (
		<div className='p-4'>
			<div className='mb-4 flex gap-4 items-center'>
				<label className='flex items-center gap-2'>
					Size:
					<input
						type='range'
						min='1'
						max='50'
						value={brushSize}
						onChange={(e) => setBrushSize(+e.target.value)}
						className='w-20'
					/>
					<span>{brushSize}px</span>
				</label>

				<label className='flex items-center gap-2'>
					Color:
					<input
						type='color'
						value={brushColor}
						onChange={(e) => setBrushColor(e.target.value)}
					/>
				</label>

				<button
					onClick={clearCanvas}
					className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
				>
					Clear
				</button>
			</div>

			<canvas
				ref={canvasRef}
				width={800}
				height={600}
				onMouseDown={startDrawing}
				onMouseMove={draw}
				onMouseUp={stopDrawing}
				onMouseLeave={stopDrawing}
				className='border-8 border-black cursor-crosshair'
			/>
		</div>
	);
}
