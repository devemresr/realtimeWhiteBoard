'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { io } from 'socket.io-client';
import Canvas from '../components/canvas';
import { Socket } from 'socket.io-client';

const whiteBoardApp = () => {
	const [connected, setConnected] = useState(false);
	const [socketId, setSocketId] = useState('');
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		const newSocket = io(`${process.env.NEXT_PUBLIC_DEV_SERVER_URL}`, {
			reconnection: true,
			reconnectionDelay: 1000, // Start with 1 second delay
			reconnectionAttempts: Infinity, // Keep trying forever
			reconnectionDelayMax: 5000, // Max 5 seconds between retries
			timeout: 20000, // Give 20 seconds to connect
		});
		socketRef.current = newSocket;

		newSocket.on('connect', () => {
			console.log('Connected with socket ID:', newSocket.id);
			setConnected(true);
			setSocketId(newSocket.id);
		});
		// todo change stuff based on ping
		setInterval(() => {
			const start = Date.now();

			newSocket.emit('ping', () => {
				const duration = Date.now() - start;
				// console.log(duration);
			});
		}, 1000);

		newSocket.on('disconnect', () => {
			console.log('Disconnected from server');
			setConnected(false);
			setSocketId('');
		});

		return () => {
			console.log('Cleaning up socket connection');
			newSocket.off('connect');
			newSocket.off('disconnect');
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
