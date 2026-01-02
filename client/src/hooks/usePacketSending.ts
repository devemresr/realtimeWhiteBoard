'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Point, StrokeData } from '../app/types_interfaces/DrawingTypes';
import DrawingAnalytics from '../util/DrawingAnalytics';
import { SOCKET_EVENTS } from '../../../shared/constants/socketIoConstants';
import { v4 as uuidv4 } from 'uuid';
import { usePackageCreator, PackageData } from './usePacketCreator';

const usePacketSending = (
	socket: Socket | null,
	analytics: React.MutableRefObject<DrawingAnalytics | null>
) => {
	const INCOMPLETE_PACKAGE_TIMEOUT = 500;

	// Use the package creator hook
	const { createPackagesFromBuffer, createFinalPackage, POINTS_PER_PACKET } =
		usePackageCreator({ pointsPerPacket: 2 });

	const pointsBuffer = useRef<Point[]>([]);
	const retryBuffer = useRef<StrokeData[]>([]);
	const incompletePacketTimeout = useRef<NodeJS.Timeout | null>(null);
	const packageNumber = useRef<number>(1);
	const strokeNumber = useRef<number>(1);
	const strokeId = useRef<string>('');

	const generateStrokeId = useCallback(() => {
		return Date.now().toString() + uuidv4().toString();
	}, []);

	const clearIncompletePacketTimeout = useCallback(() => {
		if (incompletePacketTimeout.current) {
			clearTimeout(incompletePacketTimeout.current);
			incompletePacketTimeout.current = null;
		}
	}, []);

	/**
	 * Sends a single package over the network
	 */
	const sendPackage = useCallback(
		(pkg: PackageData, strokeSequenceNumber?: number) => {
			if (!socket) return;

			const strokeData: StrokeData = {
				roomId: 'room2',
				strokes: pkg.points,
				strokeId: strokeId.current,
				packageSequenceNumber: pkg.packageSequenceNumber,
				packageId: `${strokeId.current}-${pkg.packageSequenceNumber}`,
				...(pkg.isLastPackage && { isLastPackage: true }),
				strokeSequenceNumber,
			};

			retryBuffer.current.push(strokeData);

			analytics.current.emitWithLogging(
				socket,
				`${SOCKET_EVENTS.DRAWING_PACKET}`,
				strokeData
			);
		},
		[socket, analytics]
	);

	/**
	 * Sends multiple packages
	 */
	const sendPackages = useCallback(
		(packages: PackageData[], strokeSequenceNumber?: number) => {
			packages.forEach((pkg) => sendPackage(pkg, strokeSequenceNumber));
		},
		[sendPackage]
	);

	const scheduleIncompletePacketSending = useCallback(() => {
		if (pointsBuffer.current.length > 0) {
			if (incompletePacketTimeout.current) {
				clearIncompletePacketTimeout();
			}

			incompletePacketTimeout.current = setTimeout(() => {
				const points = pointsBuffer.current.splice(
					0,
					pointsBuffer.current.length
				);
				const strokeSequenceNumber = strokeNumber.current;

				// Create incomplete package
				const pkg: PackageData = {
					points,
					packageSequenceNumber: packageNumber.current++,
				};

				sendPackage(pkg, strokeSequenceNumber);
			}, INCOMPLETE_PACKAGE_TIMEOUT);
		}
	}, [clearIncompletePacketTimeout, sendPackage]);

	const handlePackageSending = useCallback(() => {
		// Create packages from buffer
		const { packages, remainingPoints } = createPackagesFromBuffer(
			pointsBuffer.current,
			packageNumber.current
		);

		if (packages.length > 0) {
			// Clear any pending timeout since we're sending complete packets
			if (incompletePacketTimeout.current) {
				clearTimeout(incompletePacketTimeout.current);
				incompletePacketTimeout.current = null;
			}

			// Send all complete packages
			const strokeSequenceNumber = strokeNumber.current;
			sendPackages(packages, strokeSequenceNumber);

			// Update package number
			packageNumber.current += packages.length;

			// Update buffer with remaining points
			pointsBuffer.current = remainingPoints;

			console.log('Sent packages:', packages.length);
			console.log('Remaining points:', remainingPoints.length);
		}

		// Set timeout for remaining incomplete packet (if any)
		if (pointsBuffer.current.length > 0) {
			scheduleIncompletePacketSending();
		}
	}, [createPackagesFromBuffer, sendPackages, scheduleIncompletePacketSending]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			console.log('cleanup ran');
			if (incompletePacketTimeout.current) {
				clearIncompletePacketTimeout();

				const points = pointsBuffer.current.splice(0);
				const strokeSequenceNumber = strokeNumber.current++;

				const pkg = createFinalPackage(points, packageNumber.current++);
				sendPackage(pkg, strokeSequenceNumber);
			}
		};
	}, [clearIncompletePacketTimeout, sendPackage, createFinalPackage]);

	return {
		pointsBuffer,
		handlePackageSending,
		sendPackage,
		sendPackages,
		packageNumber,
		strokeNumber,
		strokeId,
		generateStrokeId,
		clearIncompletePacketTimeout,
		incompletePacketTimeout,
		analytics,
		createPackagesFromBuffer, // expose for custom usage
		createFinalPackage, // expose for custom usage
	};
};

export default usePacketSending;
