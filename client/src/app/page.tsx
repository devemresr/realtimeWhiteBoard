'use client';

import { useState, useEffect, useRef, lazy } from 'react';
import { io } from 'socket.io-client';
import { SocketEvent } from '@shared/constants/socketIoConstants';
const Canvas = lazy(() => import('../components/canvas'));
import { Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from 'src/constants/socket.config';
const whiteBoardApp = () => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);
	const [socketId, setSocketId] = useState('');
	const [error, setError] = useState<string | null>(null);

	// Ref to store the latest connected state (avoids stale closure)
	const connectedRef = useRef(connected);
	useEffect(() => {
		connectedRef.current = connected;
	}, [connected]);

	useEffect(() => {
		console.log(
			'process.env.NEXT_PUBLIC_GATEWAY_URL',
			process.env.NEXT_PUBLIC_GATEWAY_URL,
		);

		const newSocket = io(process.env.NEXT_PUBLIC_GATEWAY_URL!, SOCKET_CONFIG);

		setSocket(newSocket); // safe for children components

		const handleConnect = () => {
			console.log('Connected with socket ID:', newSocket.id);
			setConnected(true);
			setSocketId(newSocket.id);
			setError('connection error solved connected');

			newSocket.emit(SocketEvent.JOIN_ROOM, 'room2', (ack: boolean) => {
				console.log('Join room ack:', ack);
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

		newSocket.on('connect', handleConnect);
		newSocket.on('disconnect', handleDisconnect);
		newSocket.on('connect_error', handleConnectError);
		newSocket.on('error', handleError);
		newSocket.on('reconnect_attempt', handleReconnectAttempt);
		newSocket.on('reconnect_error', handleReconnectError);
		newSocket.on('reconnect_failed', handleReconnectFailed);

		return () => {
			console.log('Cleaning up socket connection');
			newSocket.close(); // automatically removes listeners
			setSocket(null); // ensure children know socket is gone
		};
	}, []);

	return (
		<>
			{socket && <Canvas socket={socket} />}
			{error && <div className='error'>Socket error: {error}</div>}
		</>
	);
};

export default whiteBoardApp;
