'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import useCanvasDrawing from '../hooks/canvas/drawing/useCanvasDrawing';
import useSocketSubscription from '../hooks/networking/socket/useSocketSubscription';
import { Point } from '@/types';
import CanvasSideBar from './canvasSideBar/canvasSideBar';
import { CanvasBarKeys, CanvasShapeKeys } from './types';
import CanvasBar from './canvasBar';
import Menu from './menu';
import { useGetOnboardingData } from '../hooks/api/endpoints/useFormPosts';
import useMouseLog from '../hooks/debug/useMouseLog';
import logger from '../util/logger';
import { useBroadcastRenderer } from '../hooks/networking/synchronization/useBroadcastPath';
import { PacketStatus } from '@/types';
import { useRoomPacketBuilder } from '../hooks/networking/packets/usePacketBuilder';
import { useCanvasState } from '../hooks/canvas/state/useCanvasState';
import usePacketTransmitter from '../hooks/networking/packets/usePacketTransmitter';
import { useOnboardingSync } from '../hooks/networking/synchronization/useOnboardingSync';

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
	const strokePointsRef = useRef<Point[]>([]);
	const canvasData = useCanvasState();

	const { requestRef, clearCanvas, drawDotOnCanvas, drawIncrementalPath } =
		useCanvasDrawing(canvasRef, brushColor, brushSize);

	const { updateMousePosition, isLogging, setIsLogging, mousePos } =
		useMouseLog();

	const { drawBroadcastPath } = useBroadcastRenderer(
		canvasData,
		drawIncrementalPath,
		drawDotOnCanvas
	);

	const { analytics } = useSocketSubscription(socket, drawBroadcastPath);
	const roomPacketBuilder = useRoomPacketBuilder({ roomId: 'room2' });
	const { handlePacketSending } = usePacketTransmitter(socket, canvasData);

	const getOnboardingDataQuerry = useGetOnboardingData();

	// hook to get onboarding data
	const { loadOnboardingData, isLoading, isError } = useOnboardingSync(
		drawBroadcastPath,
		getOnboardingDataQuerry
	);

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

			const pos: Point = {
				x: offsetX,
				y: offsetY,
				timestamp: Date.now(),
				brushColor: brushColor,
				brushSize: brushSize,
			};
			strokePointsRef.current = [pos];
			setIsDrawing(true);
			roomPacketBuilder.createNewStrokeMetaData();
			drawDotOnCanvas(pos);
		},
		[brushSize, brushColor]
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
				const pos: Point = {
					x: offsetX,
					y: offsetY,
					timestamp: Date.now(),
					brushSize,
					brushColor,
				};
				strokePointsRef.current.push(pos);
			}

			logger.debug(
				'strokePointsRef.current before getting packeted ',
				strokePointsRef.current
			);

			// Create chunks from current points
			const { packets, remainingPoints } =
				roomPacketBuilder.buildPacketsFromPoints(strokePointsRef.current);
			if (remainingPoints.length > 0) {
				logger.debug(
					'packets are created successfully but theres a leftover point'
				);
				// Set timeout for remaining incomplete packet (if any)
				// scheduleIncompletePacketSending();
			}

			// Update the ref to only keep remaining points
			strokePointsRef.current = remainingPoints;
			// store the packets to map
			packets.forEach((packet) => {
				canvasData.storePacket({
					...packet,
					status: PacketStatus.CREATED,
				});
			});

			// Send packages over network
			logger.debug(
				'getAllPacketsNeedingRetry before packet sending: ',
				canvasData.getAllPacketsToSend()
			);
			handlePacketSending();
			logger.debug(
				'getAllPacketsToSend after packet sending:  ',
				canvasData.getAllPacketsToSend()
			);

			// Render packages locally (same as broadcast rendering)
			packets.forEach((packet, index) => {
				const previousPackageId = `${packet.strokeId}-${packet.packetSequenceNumber - 1}`;

				// Get context points from previous package (for Catmull-Rom)
				const contextPoints =
					packet.packetSequenceNumber !== 1
						? canvasData.getPacket(packet.strokeId, previousPackageId).points
						: [];

				// Render with same interpolation as broadcast
				if (packet.points.length >= 2) {
					drawIncrementalPath(contextPoints, packet.points);
				} else if (packet.points.length === 1) {
					drawDotOnCanvas(packet.points[0]);
				}
			});
		},
		[isDrawing, drawIncrementalPath, drawDotOnCanvas, canvasData]
	);

	const stopDrawing = useCallback(() => {
		if (!isDrawing) return;

		// if (incompletePacketTimeout.current) {
		// 	clearIncompletePacketTimeout();
		// }

		console.log('stop drawing is called: ');

		const packet = roomPacketBuilder.buildFinalPacket(strokePointsRef.current);
		canvasData.storePacket(packet);
		handlePacketSending();

		setIsDrawing(false);
		strokePointsRef.current = [];

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
		}
	}, [
		isDrawing,
		// clearIncompletePacketTimeout,
		// sendPackage,
		// createFinalPackage,
		// strokeNumber,
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
			<button onClick={handleGetOnboardingData}> get onboardingData</button>

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
