import React, { useRef, useEffect, useState, useCallback, Ref } from 'react';
import { Socket } from 'socket.io-client';
import DrawingAnalytics from '../util/DrawingAnalytics';

interface ChildComponentProps {
	socket: Socket | null;
}

export default function Canvas({ socket }: ChildComponentProps) {
	type Point = {
		x: number;
		y: number;
		timestamp?: number;
	};
	const canvasRef = useRef(null);
	const requestRef = useRef(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [brushSize, setBrushSize] = useState(5);
	const [brushColor, setBrushColor] = useState('#000000');
	const [strokePoints, setStrokePoints] = useState([]); // stores all the data from what mouse event tracked gets cleared everytime mouseDown gets triggered
	const pointsBuffer = useRef<Point[]>([]);
	const retryBuffer = useRef([]);
	const incompletePacketTimeout = useRef(null);
	const packageNumber = useRef<number>(1);
	const strokeNumber = useRef<number>(1);
	const strokeId = useRef<string>('');
	const lastBroadcastPoint = useRef<Point>(null);
	const POINTS_PER_PACKET = 5;
	const MAXGAP = 5;
	const INCOMPLETE_PACKAGE_TIMEOUT = 500;
	// Initialize canvas settings
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = brushColor;
		ctx.lineWidth = brushSize;
	}, [brushColor, brushSize]);

	const analytics: any = useRef(null);
	useEffect(() => {
		if (!socket) return;
		console.log('render');

		analytics.current = new DrawingAnalytics('user123', 6000);
		analytics.current.startRealtimeMonitoring(2000);
		console.log('analytics', analytics, 'tpye', typeof analytics);

		const handleDrawingPacket = (data: any) => {
			const isLastPackage = data?.isLastPacket;
			const firstPackage = data?.packageSequenceNumber === 1;
			drawBroadcastPath(data?.strokes, firstPackage, isLastPackage);
		};
		socket.on('recieved-data', handleDrawingPacket);

		// Cleanup
		return () => {
			socket.off('recieved-data', handleDrawingPacket);
		};
	}, [socket]);

	// Smart interpolation that considers curve direction from previous points
	const smartInterpolation = useCallback((points: Point[], maxGap: number) => {
		if (points.length < 2) return points;

		const result = [points[0]];

		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const currentPoint = points[i];
			const distance = Math.sqrt(
				(currentPoint.x - prev.x) ** 2 + (currentPoint.y - prev.y) ** 2
			);

			if (distance <= maxGap) {
				result.push(currentPoint);
				continue;
			}

			// For only large gaps use interpolation
			const numInterpolated = Math.ceil(distance / maxGap);

			// Determine curve direction from context
			let controlOffset = { x: 0, y: 0 };

			if (i >= 2) {
				// Use previous two points to determine direction
				const prevPrev = points[i - 2];
				const direction = {
					x: prev.x - prevPrev.x,
					y: prev.y - prevPrev.y,
				};
				// Smooth the control point based on direction
				controlOffset = {
					x: direction.x * 0.3,
					y: direction.y * 0.3,
				};
			} else if (i < points.length - 1) {
				// Use next point to determine direction
				const next = points[i + 1];
				const direction = {
					x: next.x - currentPoint.x,
					y: next.y - currentPoint.y,
				};
				controlOffset = {
					x: -direction.x * 0.3,
					y: -direction.y * 0.3,
				};
			}

			// Generate smooth interpolated points using quadratic curve
			for (let j = 1; j <= numInterpolated; j++) {
				const t = j / numInterpolated;

				// Quadratic bezier interpolation
				const controlPoint = {
					x: (prev.x + currentPoint.x) / 2 + controlOffset.x,
					y: (prev.y + currentPoint.y) / 2 + controlOffset.y,
				};

				const interpolatedPoint = {
					x:
						(1 - t) * (1 - t) * prev.x +
						2 * (1 - t) * t * controlPoint.x +
						t * t * currentPoint.x,
					y:
						(1 - t) * (1 - t) * prev.y +
						2 * (1 - t) * t * controlPoint.y +
						t * t * currentPoint.y,
				};

				result.push(interpolatedPoint);
			}
		}

		return result;
	}, []);

	const drawPathOnCanvas = useCallback(
		(points: Point[], isLastPacket: boolean = undefined) => {
			if (!canvasRef.current || points.length < 2) return;

			const ctx = canvasRef.current.getContext('2d');
			ctx.strokeStyle = brushColor;
			ctx.lineWidth = brushSize;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			// Smart interpolation to fill gaps
			const interpolatedPoints = smartInterpolation(points, MAXGAP); // This array's length varies with velocity and its the final array for the canvas to draw
			// console.log(
			// 	'points in drawPathOnCanvas',
			// 	points,
			// 	'interpolatedPoints, ',
			// 	interpolatedPoints
			// );

			ctx.beginPath();
			ctx.moveTo(interpolatedPoints[0].x, interpolatedPoints[0].y);

			// Use quadratic curves for smoother rendering
			for (let i = 1; i < interpolatedPoints.length - 1; i++) {
				const current = interpolatedPoints[i];
				const next = interpolatedPoints[i + 1];
				const controlX = (current.x + next.x) / 2;
				const controlY = (current.y + next.y) / 2;

				ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
			}

			ctx.stroke();
		},
		[brushColor, brushSize, smartInterpolation]
	);
	const drawBroadcastPath = useCallback(
		(points: Point[], isFirstPacket: boolean, isLastPacket: boolean) => {
			if (points?.length === 0) return;

			const standalonePackage = isFirstPacket && isLastPacket;
			let drawPoints: Point[];

			if (isFirstPacket && !standalonePackage) {
				// First packet: draw immediately
				drawPoints = points;
				lastBroadcastPoint.current = points[points.length - 1];
				// console.log('first packet');
			} else if (standalonePackage) {
				// console.log('standalone');
				drawPoints = points;
				lastBroadcastPoint.current = null;
			} else if (isLastPacket) {
				// Last packet: ensure seamless connection
				// console.log('last packet');
				if (lastBroadcastPoint.current) {
					// Check if first point of current packet matches last broadcast point
					const firstPoint = points[0];
					const lastPoint = lastBroadcastPoint.current;
					const distance = Math.sqrt(
						(firstPoint.x - lastPoint.x) ** 2 +
							(firstPoint.y - lastPoint.y) ** 2
					);

					// If points are very close, avoid duplication // todo add it to middle package condititon
					if (distance < 1) {
						drawPoints = [lastBroadcastPoint.current, ...points.slice(1)];
					} else {
						drawPoints = [lastBroadcastPoint.current, ...points];
					}
				} else {
					drawPoints = points;
				}
				lastBroadcastPoint.current = null;
			} else {
				// Middle packets: ensure seamless connection
				drawPoints = lastBroadcastPoint.current
					? [lastBroadcastPoint.current, ...points]
					: points;
				lastBroadcastPoint.current = points[points.length - 1];
			}

			drawPathOnCanvas(drawPoints);
		},
		[drawPathOnCanvas]
	);

	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current.getBoundingClientRect();
		const { offsetX, offsetY } = e.nativeEvent;

		const pos = { x: offsetX, y: offsetY, timestamp: Date.now() };
		setStrokePoints([pos]);
		setIsDrawing(true);
		packageNumber.current = 1; // this reset has to be in the start not the stop drawing function because when a user stops if we reset the last timeout for incomplete package could get a resetted packageNumber

		pointsBuffer.current = [pos];
		strokeId.current = generateStrokeId();

		// Draw initial dot
		const ctx = canvasRef.current.getContext('2d');
		ctx.beginPath();
		ctx.arc(offsetX, offsetY, brushSize / 2, 0, Math.PI * 2);
		ctx.fillStyle = brushColor;
		ctx.fill();
	};

	const handlePackageSending = useCallback(() => {
		const packageThreshold = Math.floor(
			pointsBuffer.current.length / POINTS_PER_PACKET
		);

		if (packageThreshold > 0) {
			// Clear any pending timeout since we're sending complete packets

			if (incompletePacketTimeout.current) {
				clearTimeout(incompletePacketTimeout.current);
				incompletePacketTimeout.current = null;
			}

			// Send complete packets immediately
			for (let i = 0; i < packageThreshold; i++) {
				const strokes = pointsBuffer.current.splice(0, POINTS_PER_PACKET);
				sendPackage(strokes);
			}
		} else {
			// Set timeout for remaining incomplete packet (if any)
			if (pointsBuffer.current.length > 0) {
				if (incompletePacketTimeout.current) {
					clearTimeout(incompletePacketTimeout.current);
					incompletePacketTimeout.current = null;
				}

				incompletePacketTimeout.current = setTimeout(() => {
					const strokes = pointsBuffer.current.splice(
						0,
						pointsBuffer.current.length
					);
					sendPackage(strokes);
				}, INCOMPLETE_PACKAGE_TIMEOUT);
			}
		}
	}, [socket]);

	const sendPackage = useCallback(
		(strokes, isLastPackage?: boolean, strokeSequenceNumber?: number) => {
			const packageSequenceNumber = packageNumber.current++;
			const strokeData = {
				strokes,
				strokeId: strokeId.current,
				packageSequenceNumber,
				...(isLastPackage && { isLastPackage: true }),
				...(strokeSequenceNumber !== undefined && { strokeSequenceNumber }),
			};

			retryBuffer.current.push(strokeData);
			analytics.current.emitWithLogging(socket, 'drawing-packet', strokeData);
		},
		[handlePackageSending]
	);

	const draw = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDrawing) return;

			const { offsetX, offsetY } = e.nativeEvent;
			const currentPos = { x: offsetX, y: offsetY, timestamp: Date.now() };

			setStrokePoints((prev) => {
				const strokePoints = [...prev, currentPos];
				pointsBuffer.current.push(currentPos);

				handlePackageSending();

				cancelAnimationFrame(requestRef.current);
				requestRef.current = requestAnimationFrame(() => {
					const canvas = canvasRef.current;
					const ctx = canvas.getContext('2d');
					drawPathOnCanvas(strokePoints);
				});

				return strokePoints;
			});
		},
		[isDrawing, drawPathOnCanvas, brushSize]
	);

	const stopDrawing = useCallback(() => {
		if (!isDrawing) return; // Early return if not drawing

		// Final smooth render of the complete stroke
		if (strokePoints.length > 1) {
			cancelAnimationFrame(requestRef.current);
			drawPathOnCanvas(strokePoints);
		}

		if (incompletePacketTimeout.current) {
			// Clear any pending timeout
			clearTimeout(incompletePacketTimeout.current);
			incompletePacketTimeout.current = null;

			// Send remaining points immediately so theres no loss of timeouted packages if the user starts drawing before the timeout ends
			const strokes = pointsBuffer.current.splice(
				0,
				pointsBuffer.current.length
			);
			const strokeSequenceNumber = strokeNumber.current++;
			const isLastPackage = true;
			sendPackage(strokes, isLastPackage, strokeSequenceNumber);
		} else {
			// If no remaining points, send a stroke end signal
			const strokeSequenceNumber = strokeNumber.current++;
			const strokes = [];
			const isLastPackage = true;
			sendPackage(strokes, isLastPackage, strokeSequenceNumber);
		}

		setIsDrawing(false);
		setStrokePoints([]);

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
		}
	}, [isDrawing, strokePoints, drawPathOnCanvas]);

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};
	const generateStrokeId = (): string => {
		return Date.now().toString() + Math.random().toString(36).substr(2, 9);
	};

	// Clean up animation frame on unmount
	useEffect(() => {
		return () => {
			cancelAnimationFrame(requestRef.current);
		};
	}, []);

	const [inputInfo, setInputInfo] = useState({
		horizontal: 10,
		vertical: 0,
	});

	const onInputChange = (value, fieldName) => {
		setInputInfo((prev) => ({
			...prev,
			[fieldName]: Number(value),
		}));
	};

	return (
		<div className=''>
			<div className='mb-4 flex gap-4 items-center flex-wrap'>
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
					Points in current stroke: {strokePoints.length}
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
				<button
					onClick={() => {
						setInputInfo({ horizontal: 10, vertical: 0 });
					}}
				>
					reset
				</button>
			</div>
			<div
				className='bg-red-600 absolute top-0 left-0'
				style={{
					width: `${inputInfo.horizontal + 2.5}px`,
					height: `${inputInfo.vertical + 80}px`,
				}}
			></div>
			<canvas
				title='canvas'
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
