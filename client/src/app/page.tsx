'use client';

import React, { useState, useEffect, useRef, use, lazy } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/constants/socketIoConstants';
const Canvas = lazy(() => import('../components/canvas'));
import {
	testProtectedRoute,
	useLogin,
	useRegisterUser,
	UserRegistrationRequest,
} from '../hooks/api/endpoints/useFormPosts';
import { Socket } from 'socket.io-client';
const whiteBoardApp = () => {
	const [connected, setConnected] = useState(false);
	const [socketId, setSocketId] = useState('');
	const socketRef = useRef<Socket | null>(null);
	const [inputFields, setInputField] = useState<UserRegistrationRequest>({
		email: '',
		password: '',
	});

	const { data, isLoading, error, refetch } = testProtectedRoute({
		requiresAuth: true,
		enabled: false,
		url: '/auth/protectedRoute',
	});
	const testfunc = async (e) => {
		e.preventDefault();
		console.log('fetching...');

		const result = await refetch();
		console.log('result', result, 'isLoading', isLoading);
	};

	const [inputFieldsForLogin, setInputFieldsForLogin] =
		useState<UserRegistrationRequest>({
			email: '',
			password: '',
		});
	const handleChange = (e) => {
		const { name, value } = e.target;
		setInputField((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};
	const handleChangeForLogin = (e) => {
		const { name, value } = e.target;
		setInputFieldsForLogin((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const registerUser = useRegisterUser();
	async function handleRegister(e) {
		e.preventDefault();

		registerUser.mutate(inputFields, {
			onSuccess: (data) => {
				console.log('Registered!', data);
			},
			onError: (err) => {
				console.error('Failed:', err);
			},
		});
	}
	const loginUser = useLogin();
	async function handleLogin(e) {
		e.preventDefault();

		loginUser.mutate(inputFieldsForLogin, {
			onSuccess: (data) => {
				console.log('Registered!', data);
			},
			onError: (err) => {
				console.error('Failed:', err);
			},
		});
	}

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
			const test = 'test';
			newSocket.emit(SOCKET_EVENTS.JOIN_ROOM, test, (ack: boolean) => {
				if (ack) {
					console.log('ack for joining a room:', ack);
				}
			});

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
			<div title='isConnected'>
				{connected ? `connected with id: ${socketId}` : 'didnt connect '}
			</div>

			<Canvas socket={socketRef.current} />
		</>
	);
};

export default whiteBoardApp;
