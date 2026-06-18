export const CLIENT_EVENTS = {
	JOIN_ROOM: 'room:join',
	LEAVE_ROOM: 'room:leave',
	CLEAR_CANVAS: 'clear_canvas',
	CANVAS_OPERATION: 'canvas:operation',
	KICK_USER: 'kick:user',
	LOCK_ROOM: 'lock:room',
	LOCK_CANVAS_PAGE: 'lock:canvasPage',
	LOCK_USER: 'lock:user',
} as const;

export const STREAMED_EVENTS = [
	CLIENT_EVENTS.CANVAS_OPERATION,
	CLIENT_EVENTS.KICK_USER,
	CLIENT_EVENTS.LOCK_ROOM,
	CLIENT_EVENTS.LOCK_CANVAS_PAGE,
	CLIENT_EVENTS.LOCK_USER,
] as const;

export const SERVER_EVENTS = {
	BROADCAST_OPERATION: 'packet:broadcast',
	ROOM_JOINED: 'room:joined', // a user joined the room
	ROOM_LEFT: 'room:left',
	FORCE_DISCONNECT: 'server:force_disconnect',
	ROOM_CLOSED: 'server:room_closed',
	KICKED: 'server:kicked',
	SESSION_EXPIRED: 'server:session_expired',
} as const;

// socket.io internals
export const SOCKET_LIFECYCLE_EVENTS = {
	CONNECT: 'connect',
	DISCONNECT: 'disconnect',
	CONNECT_ERROR: 'connect_error',
	RECONNECT_FAILED: 'reconnect_failed',
	RECONNECT_ATTEMPT: 'reconnect_attempt',
	RECONNECT_ERROR: 'reconnect_error',
	ERROR: 'error',
} as const;

export type CanvasOperationEvent = typeof CLIENT_EVENTS.CANVAS_OPERATION;
export type NonCanvasClientEvent = Exclude<
	ClientEvent,
	typeof CLIENT_EVENTS.CANVAS_OPERATION
>;
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type LifecycleEvent =
	(typeof SOCKET_LIFECYCLE_EVENTS)[keyof typeof SOCKET_LIFECYCLE_EVENTS];
