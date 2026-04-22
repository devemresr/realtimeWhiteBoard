export const SOCKET_CONFIG = {
	transports: ['websocket'] as string[],
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000, // let it back off a bit more
	reconnectionAttempts: Infinity,
	timeout: 20_000,
} as const;
