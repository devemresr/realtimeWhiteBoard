'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import DrawingAnalytics from '../util/DrawingAnalytics';
import usePacketSending from '../hooks/usePacketSending';
import useCanvasDrawing from '../hooks/useCanvasDrawing';
import useSocketDrawing from '../hooks/useSocketDrawing';
import { Point } from '../app/types_interfaces/DrawingTypes';
import CanvasSideBar from './canvasSideBar/canvasSideBar';
import { CanvasBarKeys, CanvasShapeKeys } from './types';
import CanvasBar from './canvasBar';
import Menu from './menu';

interface ChildComponentProps {
	socket: Socket | null;
}

export default function Canvas({ socket }: ChildComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [selectedElement, setSelectedElement] = useState<CanvasBarKeys>('draw');
	const [brushShape, setBrushShape] = useState<CanvasShapeKeys>('square');
	const [textStyle, setTextStyle] = useState({
		size: 'mediumT',
		design: 'default',
	});
	const [isDrawing, setIsDrawing] = useState(false);
	const [brushSize, setBrushSize] = useState(8);
	const [brushColor, setBrushColor] = useState('#000000');
	const strokePointsRef = useRef([]);
	const [strokePointsCount, setStrokePointsCount] = useState(0);

	const {
		requestRef,
		drawPathOnCanvas,
		drawBroadcastPath,
		clearCanvas,
		drawDotOnCanvas,
	} = useCanvasDrawing(canvasRef, brushColor, brushSize);

	const getBoardingData = useGetOnboardingData('http://localhost:3010');
	async function getOnboardingData(e) {
		e.preventDefault();
		getBoardingData.mutate(null, {
			onSuccess: (data: any) => {
				data.data
					.flatMap((i) => i)
					.forEach((element) => {
						const msg = element.data;
						const isFirstPackage = msg.packageSequenceNumber === 1;
						const isLastPackage = msg.isLastPackage;
						drawBroadcastPath(msg.strokes, isFirstPackage, isLastPackage);
					});
			},
			onError: (err) => {
				console.error('Failed:', err);
			},
		});
	}

	const { analytics } = useSocketDrawing(socket, drawBroadcastPath);
	const {
		pointsBuffer,
		handlePackageSending,
		sendPackage,
		generateStrokeId,
		strokeId,
		packageNumber,
		strokeNumber,
		clearIncompletePacketTimeout,
		incompletePacketTimeout,
	} = usePacketSending(socket, analytics);

	const startDrawing = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const { offsetX, offsetY } = e.nativeEvent;

			const pos: Point = { x: offsetX, y: offsetY, timestamp: Date.now() };
			strokePointsRef.current = [pos];
			setStrokePointsCount(1);
			setIsDrawing(true);
			packageNumber.current = 1;

			pointsBuffer.current = [pos];
			strokeId.current = generateStrokeId();

			// Draw initial dot
			drawDotOnCanvas(pos);
		},
		[brushSize, brushColor, generateStrokeId]
	);

	const draw = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDrawing) return;

			const { offsetX, offsetY } = e.nativeEvent;
			const currentPos = { x: offsetX, y: offsetY, timestamp: Date.now() };

			// Update ref directly to avoid re-renders
			strokePointsRef.current.push(currentPos);
			setStrokePointsCount(strokePointsRef.current.length);

			pointsBuffer.current.push(currentPos);
			handlePackageSending();

			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
			requestRef.current = requestAnimationFrame(() => {
				drawPathOnCanvas(strokePointsRef.current);
			});
		},
		[isDrawing, handlePackageSending, requestRef]
	);

	const stopDrawing = useCallback(() => {
		if (!isDrawing) return;

		// Final smooth render of the complete stroke
		if (strokePointsRef.current.length > 1) {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
		}

		if (incompletePacketTimeout.current) {
			clearIncompletePacketTimeout();

			const strokes = pointsBuffer.current.splice(
				0,
				pointsBuffer.current.length
			);

			const strokeSequenceNumber = strokeNumber.current++;
			const isLastPackage = true;
			sendPackage({ strokes, isLastPackage, strokeSequenceNumber });
		} else {
			const strokeSequenceNumber = strokeNumber.current++;
			const strokes = pointsBuffer.current.splice(
				0,
				pointsBuffer.current.length
			);
			const isLastPackage = true;
			sendPackage({ strokes, isLastPackage, strokeSequenceNumber });
		}

		setIsDrawing(false);
		strokePointsRef.current = [];
		setStrokePointsCount(0);

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
		}
	}, [
		isDrawing,
		draw,
		clearIncompletePacketTimeout,
		sendPackage,
		strokeNumber,
	]);

	const [inputInfo, setInputInfo] = useState({
		horizontal: 10,
		vertical: 0,
	});

	const onInputChange = useCallback((value, fieldName) => {
		setInputInfo((prev) => ({
			...prev,
			[fieldName]: Number(value),
		}));
	}, []);

	const resetInputs = useCallback(() => {
		setInputInfo({ horizontal: 10, vertical: 0 });
	}, []);

	return (
		<div className=' flex relative'>
			{/* <div className='mb-4 flex gap-4 items-center flex-wrap'>
				<label className='flex items-center gap-2'>
					Size:
					<input
						type='range'
						min='1'
						max='50'
						value={brushSize}
						onChange={(e) => setBrushSize(+e.target.value)}
						className='w-20 '
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

				<div className='text-sm text-gray-600'>
					Points in current stroke: {strokePointsCount}
				</div>
			</div>

			<div className='flex justify-center gap-2'>
				<input
					placeholder='enter px in horizontal'
					name='horizontal'
					value={inputInfo.horizontal}
					className='max-w-fit absolute z-30 left-0 '
					onChange={(e) => onInputChange(e.target.value, 'horizontal')}
				/>
				<input
					placeholder='enter px in vertical'
					name='vertical'
					value={inputInfo.vertical}
					className='max-w-fit absolute z-30 left-80'
					onChange={(e) => onInputChange(e.target.value, 'vertical')}
				/>
				<button onClick={resetInputs}>reset</button>
			</div> */}
			<Menu />
			<CanvasBar
				setSelectedElement={setSelectedElement}
				selectedElement={selectedElement}
				clearCanvas={clearCanvas}
			/>
			<CanvasSideBar
				selectedElement={selectedElement}
				brushColor={brushColor}
				setBrushColor={setBrushColor}
				brushSize={brushSize}
				setBrushSize={setBrushSize}
				brushShape={brushShape}
				setBrushShape={setBrushShape}
				textStyle={textStyle}
				setTextStyle={setTextStyle}
			/>
			<canvas
				//title='canvas'
				ref={canvasRef}
				width={1800}
				height={1000}
				onMouseDown={startDrawing}
				onMouseMove={draw}
				onMouseUp={stopDrawing}
				onMouseLeave={stopDrawing}
				className='cursor-crosshair border border-gray-300'
			/>
		</div>
	);
}
