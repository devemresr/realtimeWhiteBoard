'use client';

import React, {
	useRef,
	useState,
	useCallback,
	useMemo,
	useEffect,
} from 'react';
import { Socket } from 'socket.io-client';
import useCanvasDrawing from '../hooks/canvas/drawing/useCanvasDrawing';
import useSocketSubscription from '../hooks/networking/socket/useSocketSubscription';
import { ToolHandlersMap, ToolType } from 'src/types/tool.types';
import CanvasSideBar from './canvasSideBar/canvasSideBar';
import { CanvasShapeKeys } from './types';
import CanvasBar from './canvasBar';
import { useGetOnboardingData } from '../hooks/api/endpoints/useFormPosts';
import useMouseLog from '../hooks/debug/useMouseLog';
import { useBroadcastOrchestrator } from 'src/hooks/networking/synchronization/useBroadcastOrchestrator';
import usePacketTransmitter from '../hooks/networking/packets/usePacketTransmitter';
import { useOnboardingSync } from '../hooks/networking/synchronization/useOnboardingSync';
import { useDrawTool } from '../hooks/canvas/drawing/useDrawTool';
import { useEraserTool } from '../hooks/canvas/drawing/useEraserTool';
import logger from 'src/util/loggerTest';
import AttendeeList from './attendeeList';
import { canvasBarItems, cursors } from './config';
import { useEraserManager } from 'src/hooks/canvas/drawing/useEraserManager';
import { canvasState } from 'src/util/canvas/state/CanvasState';
import CanvasText from './canvasText';

interface ChildComponentProps {
	socket: Socket | null;
}

export default function Canvas({ socket }: ChildComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isCanvasResizingRef = useRef(false);
	const isCanvasReadyRef = useRef(false);
	const [selectedElement, setSelectedElement] = useState<ToolType>('draw');
	const [brushShape, setBrushShape] = useState<CanvasShapeKeys>('square');
	const [textStyle, setTextStyle] = useState({
		size: 'mediumT',
		design: 'default',
	});
	const [brushSize, setBrushSize] = useState(8);
	const [brushColor, setBrushColor] = useState('#000000');
	// TODO: Implement responsive canvas with coordinate transformation
	// Replace offsetX/offsetY with getCanvasCoordinates() helper that transforms
	// pointer events from display space to internal canvas resolution (1920x1080)

	const {
		clearCanvas,
		drawDotOnCanvas,
		drawIncrementalPath,
		getEnrichedInterpolatedPoints,
		ctxRef,
		updateContextProps,
	} = useCanvasDrawing(canvasRef, {
		brushColor,
		brushSize,
	});

	const { updateMousePosition, isLogging, setIsLogging, mousePos } =
		useMouseLog();

	const { drawBroadcastPath } = useBroadcastOrchestrator(drawIncrementalPath);

	const packetTransmitter = usePacketTransmitter(socket);
	const { handlePacketSending } = packetTransmitter;

	const drawTool = useDrawTool({
		brushColor,
		brushSize,
		drawDotOnCanvas,
		drawIncrementalPath,
		handlePacketSending,
	});

	const {
		eraseStroke,
		eraseWithInterpolatedPath,
		eraseAtPoint,
		redrawCanvasWithoutErasedStrokes,
	} = useEraserManager({ drawIncrementalPath, clearCanvas });

	const { handleMessage } = useSocketSubscription(
		socket,
		drawBroadcastPath,
		eraseStroke,
		redrawCanvasWithoutErasedStrokes,
	);

	const eraserTool = useEraserTool({
		eraserSize: brushSize,
		getEnrichedInterpolatedPoints,
		packetTransmitter,
		eraseWithInterpolatedPath,
		eraseAtPoint,
	});
	const tools = useMemo<Partial<ToolHandlersMap>>(
		() => ({
			draw: drawTool,
			erase: eraserTool,
		}),
		[drawTool, eraserTool],
	);

	// const getOnboardingDataQuerry = useGetOnboardingData();

	useEffect(() => {
		if (!canvasRef.current) return;
		const { width, height } = canvasRef.current.getBoundingClientRect();
		console.log(
			'first update updateDimensions with: width height',
			width,
			height,
		);
		canvasState.updateDimensions(width, height);
		isCanvasReadyRef.current = true;
	}, []);

	useEffect(() => {
		if (!canvasRef.current) return;

		let timer: NodeJS.Timeout;

		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			isCanvasResizingRef.current = true;
			isCanvasReadyRef.current = false;

			clearTimeout(timer);
			timer = setTimeout(() => {
				logger.debug(
					{ width, height },
					'updating updateDimensions width height',
				);
				// update the canvas element's internal resolution to match display size
				canvasRef.current.width = width;
				canvasRef.current.height = height;

				canvasState.updateDimensions(width, height);

				logger.debug('clearing canvas');
				redrawCanvasWithoutErasedStrokes();
				logger.debug('redrawing');

				isCanvasResizingRef.current = false;
				isCanvasReadyRef.current = true;
			}, 100);
		});

		observer.observe(canvasRef.current);

		return () => {
			observer.disconnect();
			clearTimeout(timer); // cleanup pending debounce on unmount
		};
	}, [redrawCanvasWithoutErasedStrokes]);

	// hook to get onboarding data
	// const { loadOnboardingData, isLoading, isError } = useOnboardingSync(
	// 	getOnboardingDataQuerry,
	// 	handleMessage,
	// );
	// Handler for onboarding button
	// useEffect(() => {
	// 	loadOnboardingData().catch((error) => {
	// 		logger.error('Failed to load onboarding data on mount', error);
	// 	});
	// }, []);
	const canUseCanvas = useCallback(() => {
		const canvas = canvasRef.current;

		return Boolean(
			canvas &&
			isCanvasReadyRef.current &&
			!isCanvasResizingRef.current &&
			canvas.width > 0 &&
			canvas.height > 0,
		);
	}, []);
	const [textEditor, setTextEditor] = useState<{
		x: number;
		y: number;
		value: string;
	} | null>(null);
	const startInteraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!canUseCanvas()) return;
		const currentTool = tools[selectedElement];
		currentTool?.startInteraction?.(e);
	};

	const interact = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const currentTool = tools[selectedElement];
		currentTool?.continueInteraction?.(e);
	};

	const stopInteraction = () => {
		const currentTool = tools[selectedElement];
		currentTool?.endInteraction?.();
	};
	const cursor = canvasBarItems.find(
		(item) => item.key === selectedElement,
	).cursor;
	const test = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');

		ctx.font = '18px Arial';
		ctx.fillStyle = 'blue';

		ctx.fillText('Hello, React!', 50, 100);
	};
	return (
		<div
			className='flex relative'
			style={{
				width: '100vw',
				height: '100vh',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			<style>
				{` /* Apply custom cursor to canvas */
          canvas {
            cursor: ${cursors[cursor]}, auto;
          }
        `}
			</style>
			<button onClick={test}>test</button>
			<CanvasText
				textEditor={textEditor}
				setTextEditor={setTextEditor}
				canvasRef={canvasRef}
				brushColor={brushColor}
				textStyle={textStyle}
				setSelectedElement={setSelectedElement}
			/>
			<CanvasBar
				setSelectedElement={setSelectedElement}
				selectedElement={selectedElement}
				clearCanvas={clearCanvas}
				isLogging={isLogging}
				setIsLogging={setIsLogging}
				canvasRef={canvasRef}
				setTextEditor={setTextEditor}
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
			<AttendeeList />
			<canvas
				onContextMenu={(e) => e.preventDefault()}
				aria-label='canvas'
				ref={canvasRef}
				onPointerDown={startInteraction}
				onPointerMove={(e) => {
					interact(e);
					updateMousePosition(e);
				}}
				onPointerUp={stopInteraction}
				onPointerLeave={stopInteraction}
				style={{
					width: '100%',
					height: '100%',
					display: 'block',
					touchAction: 'none', // prevents default touch behaviors
				}}
				className='border border-gray-300'
			/>

			{isLogging && (
				<div
					style={{
						position: 'fixed',
						left: mousePos.x,
						top: mousePos.y,
						background: 'black',
						color: 'white',
						padding: '4px 8px',
						borderRadius: '4px',
						pointerEvents: 'none',
					}}
				>
					x: {mousePos.x}, y: {mousePos.y}
				</div>
			)}
		</div>
	);
}
