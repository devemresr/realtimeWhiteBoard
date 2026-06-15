import { BasePoint } from '@/types';
import { useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

type EmitOptions = {
	timeout?: number;
	maxRetries?: number;
	onSent?: () => void;
};

type EmitResult = {
	success: boolean;
	error?: Error;
};

export function useSocketEmit(socket: Socket | null) {
	const socketRef = useRef(socket);
	useEffect(() => {
		socketRef.current = socket;
	}, [socket]);
	const emit = useCallback(
		async (
			eventName: string,
			data: any,
			options: EmitOptions = {},
		): Promise<EmitResult> => {
			const { timeout = 5000, maxRetries = 3 } = options;

			if (!socket?.connected) {
				return {
					success: false,
					error: new Error('Socket not connected'),
				};
			}

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					await new Promise<void>((resolve, reject) => {
						const timer = setTimeout(() => {
							reject(new Error('Socket emit timeout'));
						}, timeout);

						socket.emit(eventName, data, (ack: boolean) => {
							console.log('ack: ', ack);

							clearTimeout(timer);
							if (ack) {
								resolve();
							} else {
								reject(new Error('Acknowledgement failed'));
							}
						});
						options.onSent?.();
					});

					return { success: true };
				} catch (error) {
					if (attempt === maxRetries) {
						return {
							success: false,
							error: error as Error,
						};
					}
					// Exponential backoff: 200ms, 400ms, 1600ms
					await new Promise((resolve) =>
						setTimeout(resolve, 200 * Math.pow(2, attempt)),
					);
				}
			}

			return {
				success: false,
				error: new Error('Unexpected error'),
			};
		},
		[socket],
	);

	return { emit };
}
