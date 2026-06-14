export const CACHE_KEYS = {
	// user scope
	USER_PROFILE: (userId: string) => `user:${userId}:profile`,

	// userId => socketId string: used for targeted server pushes (kick, ban, promote)
	ROOM_CONNECTED_USERS: (roomId: string) => `room:${roomId}:connectedUsers`,

	// integer string: count of active rooms created by this user
	USER_ACTIVE_ROOM_COUNT: (userId: string) => `user:${userId}:activeRoomCount`,

	// bitmap: each bit position is a day since RETENTION_EPOCH, 1 = was active that day
	// todo finish the bitmap feautre
	USER_ACTIVITY_BITMAP: (userId: string) => `user:retention:${userId}`,

	// room scope.
	// cached room document
	ROOM_DATA: (roomId: string) => `room:${roomId}`,

	ACTIVE_ROOMS: 'activeRooms', // Sorted Set, score = lastActivityAt timestamp
	// hash of { userId => inRoomRole }: everyone currently connected to the room
	// inRoomRole: admin | spectator | participant
	ROOM_ROLES: (roomId: string) => `room:${roomId}:members`,

	// set of userIds: users banned from rejoining this room
	ROOM_BANNED_USERS: (roomId: string) => `room:${roomId}:banned`,
} as const;

export const ROOM_INACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
export const ROOM_ARCHIVAL_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export enum Role {
	ADMIN = 'admin',
	SPECTATOR = 'spectator',
	PARTICIPANT = 'participant',
}

export const CACHE_KEYS_TTL = {
	USER_PROFILE: 60 * 60 * 24, // 24 hour
	USER_SOCKET: 60 * 60 * 24, // session / 1 day max
	USER_ROOM_COUNT: 60 * 5, // 5 min
	ROOM_ACTIVE: 60 * 60 * 24, // 24h inactivity window
} as const;
export enum RedisStream {
	DRAWING = 'stream:drawing',
}

export const REDIS_KEYS = {
	dedupKey: (roomId: string) => `room:${roomId}:dedup`,
	msgAuthorKey: (roomId: string) => `room:${roomId}:msg_authors`,
};

export enum RedisClients {
	MAIN = 'mainClient',
	ADAPTER = 'adapterClient',
}
