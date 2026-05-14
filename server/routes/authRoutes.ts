import { Router } from 'express';
import login from 'controllers/auth/login.controller';
import register from 'controllers/auth/register.controller';
import createVerifyJWT from 'services/auth/verifyJWT.middleware';
import { protectedd } from 'controllers/auth/protectedTemp.controller';
import refreshAccessToken from 'services/auth/refreshAccessToken.middleware';
import TokenBlacklist from 'services/redis/TokenBlacklist';
const router = (tokenBlacklist: TokenBlacklist) => {
	const router = Router();

	router.post('/register', register);
	router.post('/login', login);
	router.post(
		'/test',
		createVerifyJWT(tokenBlacklist),
		refreshAccessToken,
		protectedd,
	);
	return router;
};

export default router;
