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
import Menu from './menu';
import { useGetOnboardingData } from '../hooks/api/endpoints/useFormPosts';
import useMouseLog from '../hooks/debug/useMouseLog';
import { useBroadcastRenderer } from '../hooks/networking/synchronization/useBroadcastPath';
import { useRoomPacketBuilder } from '../hooks/networking/packets/usePacketBuilder';
import { useCanvasState } from '../hooks/canvas/state/useCanvasState';
import usePacketTransmitter from '../hooks/networking/packets/usePacketTransmitter';
import { useOnboardingSync } from '../hooks/networking/synchronization/useOnboardingSync';
import { useDrawTool } from '../hooks/canvas/drawing/useDrawTool';
import { useEraserTool } from '../hooks/canvas/drawing/useEraserTool';
import { useEraserManager } from '../hooks/canvas/drawing/useEraserManager';
import { useCollisionDetection } from '../hooks/canvas/drawing/useCollisionDetection';
import logger from '../util/logger';
import AttendeeList from './attendeeList';
import { canvasBarItems, cursors } from './config';

interface ChildComponentProps {
	socket: Socket | null;
}

export default function Canvas({ socket }: ChildComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
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
	const canvasState = useCanvasState({
		canvasHeight: 1000,
		canvasWidth: 1800,
	});
	const {
		getStrokeIdsNearPoint,
		storeStrokeInterpolatedPoints,
		getStrokeInterpolatedPoints,
	} = canvasState;

	const {
		clearCanvas,
		drawDotOnCanvas,
		drawPoints,
		drawIncrementalPath,
		getEnrichedInterpolatedPoints,
	} = useCanvasDrawing(canvasRef, {
		brushColor,
		brushSize,
	});

	const { updateMousePosition, isLogging, setIsLogging, mousePos } =
		useMouseLog();

	const { drawBroadcastPath } = useBroadcastRenderer(
		canvasState,
		drawIncrementalPath,
	);

	const roomPacketBuilder = useRoomPacketBuilder({ roomId: 'room2' });
	const packetTransmitter = usePacketTransmitter(socket, canvasState);
	const { handlePacketSending } = packetTransmitter;

	const drawTool = useDrawTool({
		brushColor,
		brushSize,
		roomPacketBuilder,
		canvasState,
		drawDotOnCanvas,
		drawIncrementalPath,
		storeStrokeInterpolatedPoints,
		handlePacketSending,
	});

	const collisionDetection = useCollisionDetection(canvasState);

	const eraserManager = useEraserManager({
		canvasWidth: 1800,
		canvasHeight: 1000,
		canvasState,
		drawIncrementalPath,
		drawDotOnCanvas,
		collisionDetection,
		clearCanvas,
		gridSize: 100,
	});

	const { handleMessage } = useSocketSubscription(
		socket,
		drawBroadcastPath,
		eraserManager,
	);

	const eraserTool = useEraserTool({
		canvasRef,
		canvasState,
		eraserSize: brushSize,
		eraserManager,
		roomPacketBuilder,
		getEnrichedInterpolatedPoints,
		packetTransmitter,
	});
	const tools = useMemo<Partial<ToolHandlersMap>>(
		() => ({
			draw: drawTool,
			erase: eraserTool,
		}),
		[drawTool],
	);

	const getOnboardingDataQuerry = useGetOnboardingData();

	// hook to get onboarding data
	const { loadOnboardingData, isLoading, isError } = useOnboardingSync(
		getOnboardingDataQuerry,
		handleMessage,
	);

	// Handler for onboarding button
	useEffect(() => {
		loadOnboardingData().catch((error) => {
			logger.error('Failed to load onboarding data on mount', error);
		});
	}, []);

	const startInteraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
	return (
		<div className='flex relative'>
			<style>
				{` /* Apply custom cursor to canvas */
          canvas {
            cursor: ${cursors[cursor]}, auto;
          }
        `}
			</style>
			<Menu />
			<CanvasBar
				setSelectedElement={setSelectedElement}
				selectedElement={selectedElement}
				clearCanvas={clearCanvas}
				isLogging={isLogging}
				setIsLogging={setIsLogging}
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
				width={1800}
				height={1000}
				onPointerDown={startInteraction}
				onPointerMove={(e) => {
					interact(e);
					updateMousePosition(e);
				}}
				onPointerUp={stopInteraction}
				onPointerLeave={stopInteraction}
				style={{ touchAction: 'none' }} // prevents default touch behaviors
				// todo custom cursors based on tools
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
