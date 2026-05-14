export enum SocketEvent {
	// Client -> Server
	JOIN_ROOM = 'room:join',
	LEAVE_ROOM = 'room:leave',
	CANVAS_OPERATION = 'canvas:operation',

	// Server -> Client
	BROADCAST_OPERATION = 'packet:broadcast',
	ROOM_JOINED = 'room:joined',
	ROOM_LEFT = 'room:left',

	// Built-in socket events
	CONNECT = 'connect',
	DISCONNECT = 'disconnect',
	CONNECT_ERROR = 'connect_error',
	ERROR = 'error',
	RECONNECT_FAILED = 'reconnect_failed',
	RECONNECT_ATTEMPT = 'reconnect_attempt',
	RECONNECT_ERROR = 'reconnect_error',
}
export enum RedisStream {
	DRAWING = 'stream:drawing',
}

export const REDIS_KEYS = {
	dedupKey: (streamName: string) => `${streamName}:dedup`,
};

export enum RedisClients {
	MAIN = 'mainClient',
	ADAPTER = 'adapterClient',
}
