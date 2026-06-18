import { Router } from 'express';
import login from 'controllers/auth/login.controller';
import register from 'controllers/auth/register.controller';
import { createProtectedRouteMiddleware } from 'controllers/auth/auth.helpers';
import { AUTH_ROUTES } from 'constants/routes.constant';
import logout from 'controllers/auth/logout.controller';
import refresh from 'controllers/auth/refresh.controller';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import { updateUser } from 'controllers/auth/update';
const router = (tokenBlacklist: TokenBlacklist) => {
	const router = Router();

	router.post(AUTH_ROUTES.REGISTER, register);
	router.post(AUTH_ROUTES.LOGIN, login);
	router.post(AUTH_ROUTES.LOGOUT, logout(tokenBlacklist));

	router.post(
		AUTH_ROUTES.REFRESH,
		...createProtectedRouteMiddleware(tokenBlacklist),
		refresh,
	);
	router.post(
		AUTH_ROUTES.UPDATE,
		...createProtectedRouteMiddleware(tokenBlacklist),
		updateUser,
	);
	return router;
};

export default router;
