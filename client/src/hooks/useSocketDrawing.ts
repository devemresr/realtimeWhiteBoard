'use client';

import { useRef, useEffect } from 'react';
import { SOCKET_EVENTS } from '../../../shared/constants/socketIoConstants';
import DrawingAnalytics from '../util/DrawingAnalytics';

const useSocketDrawing = (socket, drawBroadcastPath) => {
	const analytics = useRef(null);

	useEffect(() => {
		if (!socket) return;

		// todo solve the localstorage max usage issue add cleanup for local storage and reactivate monitoring
		analytics.current = new DrawingAnalytics('user123', 6000);
		analytics.current.startRealtimeMonitoring(2000);

		const handleDrawingPacket = (data) => {
			console.log('RECEIVED_DATA: ', data);

			const isFirstPackage = data.data.messageData.packageSequenceNumber === 1;
			const isLastPackage = data.data.messageData.isLastPackage;

			drawBroadcastPath(
				data.data.messageData.strokes,
				isFirstPackage,
				isLastPackage
			);
		};

		socket.on(`${SOCKET_EVENTS.RECEIVED_DATA}`, handleDrawingPacket);
		return () => socket.off(`${SOCKET_EVENTS.RECEIVED_DATA}`);
	}, [socket, drawBroadcastPath]);

	return { analytics };
};

export default useSocketDrawing;
