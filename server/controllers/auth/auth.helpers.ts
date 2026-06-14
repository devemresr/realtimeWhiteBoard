import { PublicUser } from 'models/User';
import {
	generateAccessToken,
	setRefreshTokenCookie,
} from 'services/auth/generateTokens.service';
import { RedisFactory } from 'services/redis/RedisFactory';
import { Request, Response } from 'express';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import {
	CACHE_KEYS,
	CACHE_KEYS_TTL,
} from 'controllers/constants/cacheKeys.constant';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import refreshAccessToken from 'services/auth/refreshAccessToken.service';
import createVerifyJWT from 'services/auth/verifyJWT.service';

export const issueAuthResponse = (user: PublicUser, res: Response) => {
	try {
		const { email } = user;
		const userId = user._id.toHexString();

		const accessToken = generateAccessToken(userId, email);
		setRefreshTokenCookie(userId, email, res);
		return res.status(200).json({ accessToken });
	} catch (error) {
		// TODO: Replace this with a dedicated authError type
		return res.status(500).json({ message: 'Authentication response failed' });
	}
};

/**
 * Tracks a login event in a per-user Redis bitmap.
 * Each bit position represents a day since RETENTION_EPOCH, so
 * BITCOUNT gives total active days and range queries are cheap.
 *
 * Key: user:retention:{userId}
 */
const RETENTION_EPOCH = new Date('2026-05-13').getTime();

export const trackRetention = async (userId: string): Promise<void> => {
	const dayIndex = Math.floor((Date.now() - RETENTION_EPOCH) / 86_400_000);
	const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();
	redis.setbit(`user:retention:${userId}`, dayIndex, 1);
};

export const cacheUser = async (userInfo: Omit<PublicUser, 'password'>) => {
	const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();
	const userId = userInfo._id.toHexString();
	redis.hset(CACHE_KEYS.USER_PROFILE(userId), userInfo);
	redis.expire(CACHE_KEYS.USER_PROFILE(userId), CACHE_KEYS_TTL.USER_PROFILE);
};

export const requireUserId = (req: Request): string => {
	if (!req.userId) {
		throw new Error(
			'userId missing from request - auth middleware did not run',
		);
	}
	return req.userId;
};

export const createProtectedRouteMiddleware = (
	tokenBlacklist: TokenBlacklist,
) => [createVerifyJWT(tokenBlacklist), refreshAccessToken];
