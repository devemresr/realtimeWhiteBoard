export const SOCKET_EVENTS = {
	DRAWING_PACKET: 'drawing-packet',
	BROADCASTING_DRAWING_DATA: 'broadcasting-drawing-data',
	JOIN_ROOM: 'join-room',
	LEAVE_ROOM: 'leave-room',
} as const;

export const REDIS_STREAMS = {
	DRAWING_EVENTS: 'drawing:events',
	COMPLETED_DRAWING_EVENTS: 'drawing:completed',
} as const;

export const REDIS_CLIENTS = {
	MAIN: 'mainClient',
	ADAPTER: 'adapterClient',
} as const;
