import { ROOM_ROUTES } from 'constants/routes.constant';
import { createProtectedRouteMiddleware } from 'controllers/auth/auth.helpers';
import { createRoom } from 'controllers/roomOperations/createRoom.controller';
import { joinRoom } from 'controllers/roomOperations/joinRoom.controller';
import { Router } from 'express';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import { getRooms } from 'controllers/roomOperations/getRooms';

const router = (tokenBlacklist: TokenBlacklist) => {
	const router = Router();

	router.post(
		ROOM_ROUTES.JOIN,
		...createProtectedRouteMiddleware(tokenBlacklist),
		joinRoom,
	);
	router.post(
		ROOM_ROUTES.CREATE,
		...createProtectedRouteMiddleware(tokenBlacklist),
		createRoom,
	);
	router.get(
		ROOM_ROUTES.LIST_ACTIVE,
		...createProtectedRouteMiddleware(tokenBlacklist),
		getRooms,
	);

	return router;
};

export default router;
