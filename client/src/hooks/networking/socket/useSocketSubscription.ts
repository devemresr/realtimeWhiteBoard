'use client';

import { useRef, useEffect } from 'react';
import { SOCKET_EVENTS } from '../../../../../shared/constants/socketIoConstants';
// import DrawingAnalytics from '../../../util/DrawingAnalytics';
import logger from '../../../util/logger';
import { DrawBroadcastPathFn } from '../synchronization/useBroadcastPath';

const useSocketSubscription = (
	socket,
	drawBroadcastPath: DrawBroadcastPathFn,
) => {
	const analytics = useRef(null);

	useEffect(() => {
		if (!socket) return;

		// todo solve the localstorage max usage issue add cleanup for local storage and reactivate monitoring
		// analytics.current = new DrawingAnalytics('user123', 6000);
		// analytics.current.startRealtimeMonitoring(2000);

		const handleDrawingPacket = (data) => {
			logger.debug('Received broadcasted data: ', data);
			drawBroadcastPath(data);
		};

		socket.on(
			`${SOCKET_EVENTS.BROADCASTING_DRAWING_DATA}`,
			handleDrawingPacket,
		);
		return () => socket.off(`${SOCKET_EVENTS.BROADCASTING_DRAWING_DATA}`);
	}, [socket, drawBroadcastPath]);

	return { analytics };
};

export default useSocketSubscription;
