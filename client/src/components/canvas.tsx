'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import usePacketSending from '../hooks/usePacketSending';
import useCanvasDrawing from '../hooks/useCanvasDrawing';
import useSocketDrawing from '../hooks/useSocketDrawing';
import { Point } from '../app/types_interfaces/DrawingTypes';
import CanvasSideBar from './canvasSideBar/canvasSideBar';
import { CanvasBarKeys, CanvasShapeKeys } from './types';
import CanvasBar from './canvasBar';
import Menu from './menu';
import { useGetOnboardingData } from '../hooks/useFormPosts';
import useMouseLog from '../hooks/useMouseLog';
import logger from '../util/logger';
import { useBroadcastPath } from '../util/drawing/useBroadcastPath';
import { useOnboardingData } from '../hooks/useOnboardingData';

interface ChildComponentProps {
	socket: Socket | null;
}

export default function Canvas({ socket }: ChildComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const lastDrawnIndexRef = useRef(0);
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

	const { requestRef, clearCanvas, drawDotOnCanvas, drawIncrementalPath } =
		useCanvasDrawing(canvasRef, brushColor, brushSize);

	const { updateMousePosition, isLogging, setIsLogging, mousePos } =
		useMouseLog();

	const { drawBroadcastPath } = useBroadcastPath(
		drawIncrementalPath,
		drawDotOnCanvas
	);

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
		createPackagesFromBuffer,
		createFinalPackage,
	} = usePacketSending(socket, analytics);

	const getOnboardingDataMutation = useGetOnboardingData(
		'http://localhost:3010'
	);

	// hook to get onboarding data
	const { loadOnboardingData, isLoading, isError } = useOnboardingData({
		drawBroadcastPath,
		getOnboardingDataMutation,
	});

	// Handler for onboarding button
	const handleGetOnboardingData = useCallback(
		async (e: React.MouseEvent) => {
			e.preventDefault();

			try {
				await loadOnboardingData();
				logger.info('Onboarding data loaded successfully');
			} catch (error) {
				logger.error('Failed to load onboarding data', error);
			}
		},
		[loadOnboardingData]
	);

	const startDrawing = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const { offsetX, offsetY } = e.nativeEvent;

			const pos: Point = { x: offsetX, y: offsetY, timestamp: Date.now() };
			strokePointsRef.current = [pos];
			setIsDrawing(true);
			packageNumber.current = 1;

			pointsBuffer.current = [pos];
			strokeId.current = generateStrokeId();

			drawDotOnCanvas(pos);
		},
		[brushSize, brushColor, generateStrokeId]
	);

	const draw = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!isDrawing) {
				return;
			}

			const nativeEvent = e.nativeEvent as any;
			const events = nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];

			for (const event of events) {
				const { offsetX, offsetY } = event;
				const pos: Point = { x: offsetX, y: offsetY, timestamp: Date.now() };
				strokePointsRef.current.push(pos);
				pointsBuffer.current.push(pos);
			}

			// Send packages over network
			handlePackageSending();

			// Create packages for local rendering
			const { packages, remainingPoints } = createPackagesFromBuffer(
				strokePointsRef.current.slice(lastDrawnIndexRef.current),
				packageNumber.current
			);

			logger.debug(pointsBuffer.current, 'points buffer content:');

			// Render packages locally (same as broadcast rendering)
			packages.forEach((pkg, index) => {
				const packageId = `${strokeId.current}-${pkg.packageSequenceNumber}`;
				const previousPackageId = `${strokeId.current}-${pkg.packageSequenceNumber - 1}`;

				// Get context points from previous package (for Catmull-Rom)
				const contextPoints =
					pkg.packageSequenceNumber > 1
						? strokePointsRef.current.slice(
								Math.max(0, lastDrawnIndexRef.current - 2),
								lastDrawnIndexRef.current
							)
						: [];

				logger.debug('Rendering local package', {
					packageId,
					sequenceNumber: pkg.packageSequenceNumber,
					contextPointsCount: contextPoints.length,
					newPointsCount: pkg.points.length,
				});

				// Render with same interpolation as broadcast
				if (pkg.points.length >= 2) {
					drawIncrementalPath(contextPoints, pkg.points);
				} else if (pkg.points.length === 1) {
					drawDotOnCanvas(pkg.points[0]);
				}

				lastDrawnIndexRef.current += pkg.points.length;
			});
			logger.debug(JSON.stringify(strokePointsRef.current), 'strokePointsRef');
		},
		[
			isDrawing,
			handlePackageSending,
			createPackagesFromBuffer,
			drawIncrementalPath,
			drawDotOnCanvas,
		]
	);

	const stopDrawing = useCallback(() => {
		if (!isDrawing) return;

		if (incompletePacketTimeout.current) {
			clearIncompletePacketTimeout();

			const strokes = pointsBuffer.current.splice(
				0,
				pointsBuffer.current.length
			);

			const strokeSequenceNumber = strokeNumber.current++;
			const pkg = createFinalPackage(strokes, packageNumber.current++);
			sendPackage(pkg, strokeSequenceNumber);
		} else {
			const strokeSequenceNumber = strokeNumber.current++;
			const strokes = pointsBuffer.current.splice(
				0,
				pointsBuffer.current.length
			);
			const pkg = createFinalPackage(strokes, packageNumber.current++);
			sendPackage(pkg, strokeSequenceNumber);
		}

		setIsDrawing(false);
		strokePointsRef.current = [];
		lastDrawnIndexRef.current = 0;

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
		}
	}, [
		isDrawing,
		clearIncompletePacketTimeout,
		sendPackage,
		createFinalPackage,
		strokeNumber,
	]);

	return (
		<div className=' flex relative'>
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
			<canvas
				title='canvas'
				ref={canvasRef}
				width={1800}
				height={1000}
				onPointerDown={startDrawing}
				onPointerMove={(e) => {
					draw(e);
					updateMousePosition(e);
				}}
				onPointerUp={stopDrawing}
				onPointerLeave={stopDrawing}
				style={{ touchAction: 'none' }} // prevents default touch behaviors
				className='cursor-crosshair border border-gray-300'
			/>
			<button onClick={handleGetOnboardingData}> get getOnboardingData</button>

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
