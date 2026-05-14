import { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import { TokenPayload } from 'services/auth/generateTokens.service';
import { MissingSecretError } from 'services/auth/refreshAccessToken.middleware';
import logger from '@shared/util/logger';

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
	return async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const refreshToken = req.cookies?.jwt;

			if (!refreshToken) {
				log.warn('No refresh token in cookie');
				res.status(401).json({ error: 'No refresh token provided' });
				return;
			}

			if (!process.env.ACCESS_TOKEN_SECRET) {
				throw new MissingSecretError(
					'ACCESS_TOKEN_SECRET environment variable is not set',
				);
			}

			const accessToken = extractBearerToken(req.headers.authorization);

			if (!accessToken) {
				log.debug('No access token - flagging for refresh');
				req.tokenRefreshNeeded = true;
				return next();
			}

			try {
				const decoded = jwt.verify(
					accessToken,
					process.env.ACCESS_TOKEN_SECRET,
				) as TokenPayload;
				log = log.child({ userId: decoded.userId, jti: decoded.jti });

				const isRevoked = await tokenBlacklist.isTokenRevoked(decoded.jti);

				if (isRevoked) {
					log.warn('Access token is blacklisted - flagging for refresh');
					req.userId = decoded.userId;
					req.accessToken = '';
					req.tokenRefreshNeeded = true;
					return next();
				}

				req.accessToken = accessToken;
				log.debug({ accessToken }, 'Access token verified');
				req.userId = decoded.userId;
				req.tokenRefreshNeeded = false;
				return next();
			} catch (error: unknown) {
				if (error instanceof TokenExpiredError) {
					log.debug('Access token expired - flagging for refresh');
					try {
						// verify throws so the only option to get the userId is to only decode it
						const decodedAccessToken = JSON.parse(
							atob(accessToken.split('.')[1]!),
						);
						req.userId = decodedAccessToken?.userId;
					} catch {
						log.warn('Failed to decode expired token payload');
						// still continue tokenRefreshNeeded just won't have userId
					}
					req.tokenRefreshNeeded = true;
					return next();
				}

				if (error instanceof JsonWebTokenError) {
					log.warn({ err: error }, 'Malformed access token');

					try {
						// verify throws so the only option to get the userId is to only decode it
						const decodedAccessToken = JSON.parse(
							atob(accessToken.split('.')[1]!),
						);
						req.userId = decodedAccessToken?.userId;
					} catch {
						log.warn('Failed to decode expired token payload');
						// still continue tokenRefreshNeeded just won't have userId
					}
					req.tokenRefreshNeeded = true;
					return next();
				}

				// Re-throw anything unexpected so the outer catch handles it}
				throw error;
			}
		} catch (error: unknown) {
			// MissingSecretError is a config issue, not an auth issue
			if (error instanceof MissingSecretError) {
				log.error({ err: error }, 'ACCESS_TOKEN_SECRET not set');
				res.status(500).json({ error: 'Internal server error' });
				return;
			}

			log.error({ err: error }, 'Unexpected error in verifyJWT');
			res.status(401).json({ error: 'Invalid token' });
		}
	};
};

export default createVerifyJWT;
