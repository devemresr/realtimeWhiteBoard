import { CACHE_KEYS, Role } from 'controllers/constants/cacheKeys.constant';
import Redis from 'ioredis';

export const canPerformOperation = (
	socketUserId: string,
	socketRoomId: string,
	authorId: string,
	roomId: string,
): boolean => {
	const isAuthor = authorId === socketUserId;
	const isRequestFromTheConnectedRoom = roomId === socketRoomId;
	return isAuthor && isRequestFromTheConnectedRoom;
};

export const canManageRoom = async <
	T extends {
		canvasMessageId: string;
		authorId: string;
		roomId: string;
	},
>(
	redis: Redis,
	eventName: string,
	payload: T,
	socketUserId: string,
	socketRoomId: string,
) => {
	const isAdminOfTheRequestedRoom =
		(await redis.hget(CACHE_KEYS.ROOM_ROLES(socketRoomId), socketUserId)) ===
		Role.ADMIN;
	const isRequestFromTheConnectedRoom = payload.roomId === socketRoomId;

	// todo add check for this case after the kickEvent is added
	// if (eventName === CLIENT_EVENTS.KICK_USER) {
	// 	const kickedUserSocketId = await redis.hget(
	// 		CACHE_KEYS.ROOM_CONNECTED_USERS(socketRoomId),
	// 		(payload as kickEvent).kickedUserId, // <- this IS the socketUserId (field/key in the hash)
	// 	);
	// const isKickedUserInRequestedRoom = kickedUserSocketId !== null;
	// prevent admin from kicking themselves
	// const isSelfKick = (payload as kickEvent).kickedUserId === socketUserId;

	// return (
	// 	role === Role.ADMIN &&
	// 	isRequestFromTheConnectedRoom &&
	// 	isKickedUserInRequestedRoom &&
	// 	!isSelfKick
	// );
	// }
	return isAdminOfTheRequestedRoom && isRequestFromTheConnectedRoom;
};
