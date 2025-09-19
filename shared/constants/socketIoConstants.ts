export const SOCKET_EVENTS = {
	DRAWING_PACKET: 'drawing-packet',
	RECEIVED_DATA: 'received-data',
	JOIN_ROOM: 'join-room',
	LEAVE_ROOM: 'leave-room',
} as const;

export const REDIS_STREAMS = {
	DRAWING_EVENTS: 'drawing:events',
	COMPLETED_DRAWING_EVENTS: 'drawing:completed',
} as const;
