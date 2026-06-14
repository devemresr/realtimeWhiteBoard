import { NextFunction, Request, Response } from 'express';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import logger from '@shared/util/logger';
import { verifyAccessToken } from './verifyAccessToken';

const extractBearerToken = (authHeader: string | undefined): string | null => {
	if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
	return authHeader.split(' ')[1] ?? null;
};

let log = logger.child({ method: 'createVerifyJWT' });

/**
 * Factory that returns a JWT verification middleware bound to a TokenBlacklist instance.
 *
 * Flow:
 * - No refresh token cookie → 401 immediately, nothing to fall back to
 * - No / invalid Bearer token → flag for refresh, let refreshAccessToken handle it
 * - Valid token but blacklisted → flag for refresh
 * - Expired token → flag for refresh
 * - Valid, non-blacklisted token → attach to req and continue
 */
const createVerifyJWT = (tokenBlacklist: TokenBlacklist) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		const result = await verifyAccessToken(
			extractBearerToken(req.headers.authorization),
			tokenBlacklist,
		);

		switch (result.status) {
			case 'invalid':
				return res.status(401).json({ error: 'No refresh token provided' });
			case 'refresh':
				req.userId = result.userId as string;
				req.tokenRefreshNeeded = true;
				return next();
			case 'valid':
				req.userId = result.userId;
				req.accessToken = extractBearerToken(req.headers.authorization)!;
				req.tokenRefreshNeeded = false;
				return next();
		}
	};
};

export default createVerifyJWT;
