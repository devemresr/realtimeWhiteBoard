'use client';

import React, { useState, useEffect, useRef, use, lazy } from 'react';
import { io } from 'socket.io-client';
const Canvas = lazy(() => import('../components/canvas'));
import { Socket } from 'socket.io-client';

const whiteBoardApp = () => {
	const [connected, setConnected] = useState(false);
	const [socketId, setSocketId] = useState('');
	const socketRef = useRef<Socket | null>(null);

	// async function testFunc() {
	// 	console.log('testFunc');

	// 	const url = `${process.env.NEXT_PUBLIC_DEV_SERVER_URL}/`;
	// 	try {
	// 		const starttime = Date.now();
	// 		console.log('fetchin');

	// 		const response = await fetch(url);
	// 		const endtime = Date.now();
	// 		console.log('response, time:', endtime - starttime, response);
	// 	} catch (error) {
	// 		console.error(error.message, 'HERE');
	// 		console.log('err');
	// 	}
	// }
	// useEffect(() => {
	// 	testFunc();
	// }, []);

	useEffect(() => {
		const newSocket = io(`${process.env.NEXT_PUBLIC_DEV_SERVER_URL}`, {
			reconnection: true,
			reconnectionDelay: 1000, // Start with 1 second delay
			reconnectionAttempts: Infinity, // Keep trying forever
			reconnectionDelayMax: 2000,
			timeout: 20000, // Give 20 seconds to connect
		});
		socketRef.current = newSocket;
		newSocket.on('connect', () => {
			console.log('Connected with socket ID:', newSocket.id);
			setConnected(true);
			setSocketId(newSocket.id);
		});

		newSocket.on('disconnect', () => {
			console.log('Disconnected from server');
			setConnected(false);
			setSocketId('');
		});

		newSocket.on('reconnect_attempt', (attemptNumber) => {
			console.log('Reconnection attempt:', attemptNumber);
		});

		newSocket.on('reconnect_error', (error) => {
			console.error('Reconnection error:', error);
		});

		newSocket.on('reconnect_failed', () => {
			console.error('Reconnection failed - all attempts exhausted');
		});

		return () => {
			console.log('Cleaning up socket connection');
			newSocket.off('connect');
			newSocket.off('disconnect');
			newSocket.off('connect_error');
			newSocket.off('reconnect_attempt');
			newSocket.off('reconnect_error');
			newSocket.off('reconnect_failed');
			newSocket.close();
		};
	}, []);

	return (
		<>
			{connected ? `connected with id: ${socketId}` : 'didnt connect '}
			<Canvas socket={socketRef.current} />
		</>
	);
};

export default whiteBoardApp;
