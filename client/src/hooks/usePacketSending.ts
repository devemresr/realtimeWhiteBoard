'use client';

import { useRef, useCallback, useEffect, Ref } from 'react';
import { Socket } from 'socket.io-client';
import { Point, StrokeData } from '../app/types_interfaces/DrawingTypes';
import DrawingAnalytics from '../util/DrawingAnalytics';
import { SOCKET_EVENTS } from '../../../shared/constants/socketIoConstants';

const usePacketSending = (
	socket: Socket | null,
	analytics: React.MutableRefObject<DrawingAnalytics | null>
) => {
	const POINTS_PER_PACKET = 10;
	const INCOMPLETE_PACKAGE_TIMEOUT = 500;
	const pointsBuffer = useRef<Point[]>([]);
	const retryBuffer = useRef<StrokeData[]>([]);
	const incompletePacketTimeout = useRef<NodeJS.Timeout | null>(null);
	const packageNumber = useRef<number>(1);
	const strokeNumber = useRef<number>(1);
	const strokeId = useRef<string>('');

	const generateStrokeId = useCallback(() => {
		return Date.now().toString() + Math.random().toString(36).substr(2, 9);
	}, []);

	const clearIncompletePacketTimeout = useCallback(() => {
		if (incompletePacketTimeout.current) {
			clearTimeout(incompletePacketTimeout.current);
			incompletePacketTimeout.current = null;
		}
	}, []);

	const sendPackage = useCallback(
		(
			strokes: Point[],
			isLastPackage?: boolean,
			strokeSequenceNumber?: number
		) => {
			if (!socket) return;

			const packageSequenceNumber = packageNumber.current++;
			const strokeData: StrokeData = {
				roomId: 'test',
				strokes,
				strokeId: strokeId.current,
				packageSequenceNumber,
				...(isLastPackage && { isLastPackage: true }),
				...(strokeSequenceNumber !== undefined && { strokeSequenceNumber }),
			};

			retryBuffer.current.push(strokeData);

			analytics.current.emitWithLogging(
				socket,
				`${SOCKET_EVENTS.DRAWING_PACKET}`,
				strokeData
			);
		},
		[socket]
	);

	const scheduleIncompletePacketSending = useCallback(() => {
		if (pointsBuffer.current.length > 0) {
			if (incompletePacketTimeout.current) {
				clearIncompletePacketTimeout();
			}

			incompletePacketTimeout.current = setTimeout(() => {
				const strokes = pointsBuffer.current.splice(
					0,
					pointsBuffer.current.length
				);
				sendPackage(strokes);
			}, INCOMPLETE_PACKAGE_TIMEOUT);
		}
	}, [clearIncompletePacketTimeout, sendPackage]);

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
			scheduleIncompletePacketSending();
		}
	}, [sendPackage, scheduleIncompletePacketSending]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (incompletePacketTimeout.current) {
				clearIncompletePacketTimeout();
				const strokes = pointsBuffer.current.splice(0);
				sendPackage(strokes, true, strokeNumber.current++);
			}
		};
	}, [clearIncompletePacketTimeout, sendPackage]);

	return {
		pointsBuffer,
		handlePackageSending,
		sendPackage,
		packageNumber,
		strokeNumber,
		strokeId,
		generateStrokeId,
		clearIncompletePacketTimeout,
		incompletePacketTimeout,
		analytics,
	};
};

export default usePacketSending;
