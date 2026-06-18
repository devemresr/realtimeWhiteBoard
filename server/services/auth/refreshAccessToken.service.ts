import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateAccessToken } from './generateTokens.service';
import logger from '@shared/util/logger';
import { TokenPayload } from 'utils/token.helpers';
import {
	InvalidRefreshToken,
	MissingRefreshTokenError,
	MissingSecretError,
	RevokedSessionError,
} from './auth.errors';
import { handleAuthError } from './handleAuthErrors';
import TokenBlacklist from 'services/redis/TokenBlacklist';

let log = logger.child({ method: 'refreshAccessToken' });

/**
 * `refreshAccessToken` - Express middleware that silently rotates an expired
 * access token using the refresh token stored in an HttpOnly cookie.
 *
 * Flow:
 * 	Skip entirely when `req.tokenRefreshNeeded` is falsy.
 * 	Read the refresh token from the `jwt` cookie.
 * 	Verify the refresh token with REFRESH_TOKEN_SECRET.
 * 	Mint a new access token and attach it to `req.accessToken`.
 * 	Clear the `tokenRefreshNeeded` flag and call `next()`.
 *
 * On any failure the middleware short-circuits with an appropriate HTTP error
 * response so downstream handlers never see a stale/invalid token.
 */
const refreshAccessToken = (tokenBlacklist: TokenBlacklist) => {
	return async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		// Guard: only run when a previous middleware flagged that a refresh is due.
		if (!req.tokenRefreshNeeded) {
			log.debug('Token refresh not needed - skipping middleware');
			return next();
		}

		const userId = req?.userId;
		log.child({ userId });
		log.info('Starting token refresh');

		try {
			const refreshToken: string | undefined = req.cookies?.jwt;

			if (!refreshToken) throw new MissingRefreshTokenError();

			// Guard against a missing secret - configuration error, not an auth
			// error, so we surface it as 500 rather than 401.
			if (!process.env.REFRESH_TOKEN_SECRET) {
				throw new MissingSecretError('REFRESH_TOKEN_SECRET');
			}

			/**
			 * A blacklisted refresh token means the session was explicitly revoked
			 * (e.g. logout). Reject immediately regardless of the access token state
			 * minting a new access token against a dead session would defeat the
			 * purpose of blacklisting.
			 */
			const decodedRefreshToken = jwt.verify(
				refreshToken,
				process.env.REFRESH_TOKEN_SECRET,
			) as TokenPayload;

			logger.info(
				{
					refreshTokenExists: !!refreshToken,
					refreshJti: decodedRefreshToken.jti,
				},
				'refresh token decoded',
			);
			if (!decodedRefreshToken.jti) {
				throw new InvalidRefreshToken();
			}

			const isRefreshRevoked = await tokenBlacklist.isTokenRevoked(
				decodedRefreshToken.jti,
			);

			if (isRefreshRevoked) {
				throw new RevokedSessionError();
			}

			log.debug('Refresh token verified successfully');

			// Mint a fresh access token and attach it to the request object so
			// subsequent middleware / route handlers can forward it to the client.
			req.accessToken = generateAccessToken(
				decodedRefreshToken.userId,
				decodedRefreshToken.email,
			);
			req.tokenRefreshNeeded = false;

			log.info('Access token refreshed successfully');

			return next();
		} catch (error: unknown) {
			handleAuthError(error, res, log);
		}
	};
};
export default refreshAccessToken;
