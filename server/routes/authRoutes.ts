import { Router } from 'express';
import login from 'controllers/auth/login.controller';
import register from 'controllers/auth/register.controller';
import { protectedd } from 'controllers/auth/protectedTemp.controller';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import { createProtectedRouteMiddleware } from 'controllers/auth/auth.helpers';
import { AUTH_ROUTES } from 'constants/routes.constant';
const router = (tokenBlacklist: TokenBlacklist) => {
	const router = Router();

	router.post(AUTH_ROUTES.REGISTER, register);
	router.post(AUTH_ROUTES.LOGIN, login);
	router.post(
		AUTH_ROUTES.TEST,
		...createProtectedRouteMiddleware(tokenBlacklist),
		protectedd,
	);
	return router;
};

export default router;
