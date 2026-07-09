import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from 'utils/logger';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import {
	MissingRefreshTokenError,
	MissingSecretError,
} from 'services/auth/auth.errors';
import { TokenPayload } from 'utils/token.helpers';
import { JWT_EXPIRE_TIMES } from 'services/auth/constants/jwtConstants';
import { cookieOptions } from 'services/auth/generateTokens.service';

const log = logger.child({ method: 'logout' });

const createLogout = (tokenBlacklist: TokenBlacklist) => {
	return async (req: Request, res: Response) => {
		try {
			const refreshToken: string | undefined = req.cookies?.jwt;
			if (!refreshToken) {
				throw new MissingRefreshTokenError();
			}
			const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

			if (!refreshSecret) {
				throw new MissingSecretError('REFRESH_TOKEN_SECRET');
			}
			const { jti: refreshJti, exp } = jwt.verify(
				refreshToken,
				refreshSecret,
			) as TokenPayload & { exp: number };

			// at worst case we would ttl it for the full duration of it
			const ttlSeconds = Math.min(
				JWT_EXPIRE_TIMES.REFRESHTOKEN,
				exp - Math.floor(Date.now() / 1000),
			);

			logger.debug({ ttlSeconds });

			if (refreshJti) {
				await tokenBlacklist.blacklistToken(refreshJti, ttlSeconds);
			}

			res.clearCookie('jwt', cookieOptions);
			res.status(200).json({
				success: true,
				message: 'Logged out successfully',
			});
		} catch (error: unknown) {
			log.error({ err: error }, 'Unexpected error during logout');
			res.clearCookie('jwt', cookieOptions);

			res.status(500).json({
				success: false,
				message: 'Internal server error',
			});
		}
	};
};

export default createLogout;
