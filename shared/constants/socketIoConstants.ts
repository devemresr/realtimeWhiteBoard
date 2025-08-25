export const SOCKET_EVENTS = {
	DRAWING_PACKET: 'drawing-packet',
	RECEIVED_DATA: 'received-data',
} as const;

export const REDIS_STREAM_EVENTS = {
	COMPLETED_DRAWING_EVENT: 'completedDrawingEvents',
	DRAWING_EVENT: 'drawingEvents',
} as const;
