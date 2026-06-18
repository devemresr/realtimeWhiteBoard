import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { SOCKET_CONFIG } from 'src/constants/socket.config';
import {
	SERVER_EVENTS,
	SOCKET_LIFECYCLE_EVENTS,
} from '@shared/constants/socketIo.constant';
import { useSocketStore } from 'src/store/socketStore';
import { useUserStore } from 'src/store/UserStore';

export function useSocket() {
	const userId = useUserStore((state) => state.userId);
	const setSocket = useSocketStore((state) => state.setSocket);
	const socket = useSocketStore((state) => state.socket);

	useEffect(() => {
		if (!userId) return;

		const newSocket = io(process.env.NEXT_PUBLIC_GATEWAY_URL!, {
			...SOCKET_CONFIG,
			auth: { token: localStorage.getItem('accessToken') },
		});

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.CONNECT, () => {
			setSocket(newSocket);
			toast.success('Connected to server');
		});

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.DISCONNECT, (reason) => {
			setSocket(null);
			toast.warn(`Disconnected: ${reason}`);
		});

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.CONNECT_ERROR, (err) => {
			toast.error(`Connection error: ${err.message}`);
		});

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.ERROR, (err) => {
			toast.error(`Socket error: ${err?.message ?? 'Unknown error'}`);
		});

		newSocket.on(
			SOCKET_LIFECYCLE_EVENTS.RECONNECT_ATTEMPT,
			(attempt: number) => {
				toast.info(`Reconnecting... (attempt ${attempt})`, {
					toastId: 'reconnect',
				});
			},
		);

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.RECONNECT_ERROR, (err) => {
			toast.error(`Reconnect error: ${err.message}`);
		});

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.RECONNECT_FAILED, () => {
			toast.error('Reconnection failed — please refresh the page', {
				autoClose: false,
			});
		});
		newSocket.on(SERVER_EVENTS.FORCE_DISCONNECT, () => {
			toast.error('You have been disconnected by the server.', {
				autoClose: false,
				toastId: 'force_disconnect',
			});

			newSocket.disconnect();
		});

		newSocket.on(SERVER_EVENTS.ROOM_CLOSED, () => {
			toast.warn('This room has been closed.', {
				autoClose: false,
				toastId: 'room_closed',
			});

			newSocket.disconnect();
		});

		newSocket.on(SERVER_EVENTS.KICKED, () => {
			toast.error('You have been kicked from the room.', {
				autoClose: false,
				toastId: 'kicked',
			});

			newSocket.disconnect();
		});

		newSocket.on(SERVER_EVENTS.SESSION_EXPIRED, () => {
			toast.error('Your session has expired. Please login again.', {
				autoClose: false,
				toastId: 'session_expired',
			});

			localStorage.removeItem('accessToken');

			newSocket.disconnect();

			// optional
			// router.push('/login');
		});

		return () => {
			newSocket.close();
			setSocket(null);
		};
	}, [userId]);

	return socket;
}
