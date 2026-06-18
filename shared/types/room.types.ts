export interface RoomData {
	// identifiers
	roomId: string;
	createdBy: string;

	// metadata
	name: string;
	description?: string;
	password?: string;

	// room states
	roomStatus: RoomStatus;
	isLocked: boolean;
	banned: string[];

	// limits
	maxMembers?: number;
}

export enum RoomStatus {
	ARCHIVED = 'ARCHIVED',
	ACTIVE = 'ACTIVE',
	LOCKED = 'LOCKED',
	PRIVATE = 'PRIVATE',
}

export type JoinRoomRequest = {
	roomId: string;
	role?: Role;
	password?: string;
};

export enum Role {
	ADMIN = 'admin',
	SPECTATOR = 'spectator',
	PARTICIPANT = 'participant',
}
