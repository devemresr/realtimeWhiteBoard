// hooks/useDrawTool.ts
import { useCallback, useRef, useState } from 'react';
import { useCanvasState } from './canvas/state/useCanvasState';
import { useRoomPacketBuilder } from './networking/packets/usePacketBuilder';
import { Point } from '@/types';
import usePacketTransmitter from './networking/packets/usePacketTransmitter';

interface UseDrawToolProps {
	brushColor: string;
	brushSize: number;
	roomPacketBuilder: ReturnType<typeof useRoomPacketBuilder>;
	canvasState: ReturnType<typeof useCanvasState>;
	drawDotOnCanvas: (pos: Point) => void;
	drawIncrementalPath: (contextPoints: Point[], points: Point[]) => void;
	handlePacketSending: () => boolean;
}

export const useDrawTool = ({
	brushColor,
	brushSize,
	roomPacketBuilder,
	canvasState,
	drawDotOnCanvas,
	drawIncrementalPath,
	handlePacketSending,
}: UseDrawToolProps) => {
	const [isDrawing, setIsDrawing] = useState(false);
	const strokePointsRef = useRef<Point[]>([]);
	const requestRef = useRef<number | null>(null);

	const startInteraction = useCallback(
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
		[brushSize, brushColor, roomPacketBuilder, drawDotOnCanvas]
	);

	const continueInteraction = useCallback(
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

			console.debug(
				'strokePointsRef.current before getting packeted',
				strokePointsRef.current
			);

			// Create chunks from current points
			const { packets, remainingPoints } =
				roomPacketBuilder.buildPacketsFromPoints(strokePointsRef.current);

			if (remainingPoints.length > 0) {
				console.debug(
					'packets are created successfully but theres a leftover point'
				);
				// Set timeout for remaining incomplete packet (if any)
				// scheduleIncompletePacketSending();
			}

			// Update the ref to only keep remaining points
			strokePointsRef.current = remainingPoints;

			// Store the packets to map
			packets.forEach((packet: any) => {
				canvasState.storePacket({
					...packet,
					status: 'CREATED', // PacketStatus.CREATED
				});
			});

			// Send packages over network
			console.debug(
				'getAllPacketsNeedingRetry before packet sending:',
				canvasState.getAllPacketsToSend()
			);
			handlePacketSending();
			console.debug(
				'getAllPacketsToSend after packet sending:',
				canvasState.getAllPacketsToSend()
			);

			// Render packages locally (same as broadcast rendering)
			packets.forEach((packet: any) => {
				const previousPackageId = `${packet.strokeId}-${packet.packetSequenceNumber - 1}`;

				// Get context points from previous package (for Catmull-Rom)
				const contextPoints =
					packet.packetSequenceNumber !== 1
						? canvasState.getPacket(packet.strokeId, previousPackageId).points
						: [];

				// Render with same interpolation as broadcast
				if (packet.points.length >= 2) {
					drawIncrementalPath(contextPoints, packet.points);
				} else if (packet.points.length === 1) {
					drawDotOnCanvas(packet.points[0]);
				}
			});
		},
		[
			isDrawing,
			brushSize,
			brushColor,
			roomPacketBuilder,
			canvasState,
			handlePacketSending,
			drawIncrementalPath,
			drawDotOnCanvas,
		]
	);

	const endInteraction = useCallback(() => {
		if (!isDrawing) return;

		console.log('stop drawing is called');

		const packet = roomPacketBuilder.buildFinalPacket(strokePointsRef.current);
		canvasState.storePacket(packet);
		handlePacketSending();

		setIsDrawing(false);
		strokePointsRef.current = [];

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
			requestRef.current = null;
		}
	}, [isDrawing, roomPacketBuilder, canvasState, handlePacketSending]);

	return {
		startInteraction,
		continueInteraction,
		endInteraction,
		isDrawing,
	};
};
