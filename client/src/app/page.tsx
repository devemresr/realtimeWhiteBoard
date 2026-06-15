'use client';

import { useState, useEffect, useRef, lazy } from 'react';
import { io } from 'socket.io-client';
import {
	CLIENT_EVENTS,
	SOCKET_LIFECYCLE_EVENTS,
} from '../../../shared/constants/socketIo.constant';
const Canvas = lazy(() => import('../components/canvas'));
import { Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from 'src/constants/socket.config';
import { useCreateRoom } from 'src/hooks/api/endpoints/useFormPosts';
import logger from 'src/util/loggerTest';
import { useRoomStatusStore } from 'src/store/RoomStore';
import { useUserStore } from 'src/store/UserStore';
const whiteBoardApp = () => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);
	// const [token, setToken] = useState<string | null>(
	// 	() => localStorage.getItem('accessToken'), // lazy init, matches what the socket already used
	// );
	const [socketId, setSocketId] = useState('');
	const [error, setError] = useState<string | null>(null);
	// Ref to store the latest connected state (avoids stale closure)
	const connectedRef = useRef(connected);
	useEffect(() => {
		connectedRef.current = connected;
	}, [connected]);

	const createRoom = useCreateRoom();
	const setRoom = useRoomStatusStore((state) => state.setRoom);
	const roomId = useRoomStatusStore((state) => state.roomId);
	const userId = useUserStore((state) => state.userId);

	useEffect(() => {
		if (userId === '') {
			logger.debug(
				{ userId },
				'session: userId caused a call but it doesnt exist yet',
			);
		}

		const newSocket = io(
			process.env.NEXT_PUBLIC_GATEWAY_URL!,

			{
				...SOCKET_CONFIG,
				// todo change localstorage to zustand
				auth: { token: localStorage.getItem('accessToken') },
			},
		);

		setSocket(newSocket); // safe for children components

		const handleConnect = async () => {
			console.log('Connected with socket ID:', newSocket.id);
			setConnected(true);
			setSocketId(newSocket.id);
			setError('connection error solved connected');

			const data = await createRoom.mutateAsync({});

			const { roomId } = data;

			newSocket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId }, (ack) => {
				console.log('Join room ack:', ack);
				setRoom({
					roomId,
				});
			});
		};

		const handleDisconnect = () => {
			console.log('Disconnected from server');
			setConnected(false);
			setSocketId('');
		};

		const handleConnectError = (err: any) => {
			console.error('Connection error:', err.message);
			setError(err.message);
		};

		const handleError = (err: any) => {
			console.error('Socket error:', err);
		};

		const handleReconnectAttempt = (attemptNumber: number) => {
			console.log('Reconnection attempt:', attemptNumber);
		};

		const handleReconnectError = (err: any) => {
			console.error('Reconnection error:', err);
			setError(err.message);
		};

		const handleReconnectFailed = () => {
			console.error('Reconnection failed - all attempts exhausted');
			setError('Reconnection failed');
		};

		newSocket.on(SOCKET_LIFECYCLE_EVENTS.CONNECT, handleConnect);
		newSocket.on(SOCKET_LIFECYCLE_EVENTS.DISCONNECT, handleDisconnect);
		newSocket.on(SOCKET_LIFECYCLE_EVENTS.CONNECT_ERROR, handleConnectError);
		newSocket.on(SOCKET_LIFECYCLE_EVENTS.ERROR, handleError);
		newSocket.on(
			SOCKET_LIFECYCLE_EVENTS.RECONNECT_ATTEMPT,
			handleReconnectAttempt,
		);
		newSocket.on(SOCKET_LIFECYCLE_EVENTS.RECONNECT_ERROR, handleReconnectError);
		newSocket.on(
			SOCKET_LIFECYCLE_EVENTS.RECONNECT_FAILED,
			handleReconnectFailed,
		);

		return () => {
			console.log('Cleaning up socket connection');
			newSocket.close(); // automatically removes listeners
			setSocket(null); // ensure children know socket is gone
		};
	}, [userId]);

	return <>{socket && <Canvas socket={socket} />}</>;
};

export default whiteBoardApp;
