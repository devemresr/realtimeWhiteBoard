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

	const getBoardingData = useGetOnboardingData('http://localhost:3010');
	async function getOnboardingData(e) {
		e.preventDefault();
		getBoardingData.mutate(null, {
			onSuccess: (data: any) => {
				console.log('get getOnboardingData: ', data);

				const allStrokes = data.data;
				const seen = new Set();
				const duplicatePackages = [];

				const deduped = allStrokes.map((packages) =>
					packages.filter((item) => {
						if (seen.has(item.packageId)) {
							duplicatePackages.push(item);
							return false;
						}
						seen.add(item.packageId);
						return true;
					})
				);

				logger.debug({ deduped, duplicatePackages, seen });

				deduped.forEach((element) => {
					element.forEach((i) => {
						logger.debug(
							{ package: i, strokes: i.strokes, packageId: i.packageId, i },
							'deduped package'
						);
						const isFirstPackage = i?.packageSequenceNumber;
						const isLastPackage = i?.isLastPackage;
						drawBroadcastPath(
							i.strokes ?? [],
							isFirstPackage,
							isLastPackage,
							i.packageId,
							i.strokeId,
							i.packageSequenceNumber
						);
					});
				});
			},
			onError: (err) => {
				console.error('Failed:', err);
			},
		});
	}
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
	} = usePacketSending(socket, analytics);

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

			handlePackageSending();

			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}

			requestRef.current = requestAnimationFrame(() => {
				console.debug('rAF executing...');
				const lastDrawnIndex = lastDrawnIndexRef.current;
				const totalPoints = strokePointsRef.current.length;

				if (totalPoints <= lastDrawnIndex) {
					requestRef.current = null;
					return;
				}

				const contextStart = Math.max(Math.max(0, lastDrawnIndex - 2) - 1, 0);
				logger.debug(
					'the segment',
					strokePointsRef.current.slice(contextStart, totalPoints + 1),
					'lastDrawnIndex',
					lastDrawnIndex
				);

				const segment = strokePointsRef.current.slice(
					contextStart,
					totalPoints + 1
				);
				const oldPointsCount = lastDrawnIndex - contextStart;

				console.debug(
					`Drawing: total=${totalPoints}, new=${totalPoints - lastDrawnIndex}, ` +
						`segment=${segment.length}, context=${oldPointsCount},  contextStart=${contextStart}`
				);

				logger.debug(strokePointsRef.current, 'strokePointsRef');
				// drawIncrementalPath(segment, oldPointsCount);
				lastDrawnIndexRef.current = totalPoints;
				requestRef.current = null;
			});
		},
		[isDrawing, handlePackageSending]
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
		lastDrawnIndexRef.current = 0;

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
			<button onClick={getOnboardingData}> get getOnboardingData</button>

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
