import { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { generateAccessToken } from './generateTokens.service';

import pino from 'pino';
import logger from '@shared/util/logger';
import { TokenPayload } from '@shared/util/parseAccessToken';

let log = logger.child({ method: 'refreshAccessToken' });

/**
 * Thrown when the refresh-token cookie is absent from the incoming request.
 */
export class MissingRefreshTokenError extends Error {
	constructor(message = 'No refresh token provided') {
		super(message);
		this.name = 'MissingRefreshTokenError';
	}
}

export class MissingSecretError extends Error {
	constructor(
		message = 'REFRESH_TOKEN_SECRET environment variable is not set',
	) {
		super(message);
		this.name = 'MissingSecretError';
	}
}

// Middleware
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
const refreshAccessToken = async (
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
		// Extract the refresh token from the HttpOnly cookie.
		const refreshToken: string | undefined = req.cookies?.jwt;

		if (!refreshToken) {
			throw new MissingRefreshTokenError();
		}

		// Guard against a missing secret - configuration error, not an auth
		// error, so we surface it as 500 rather than 401.
		if (!process.env.REFRESH_TOKEN_SECRET) {
			throw new MissingSecretError();
		}
		log.debug({ refreshToken });

		const decoded = jwt.verify(
			refreshToken,
			process.env.REFRESH_TOKEN_SECRET,
		) as TokenPayload;

		log.debug('Refresh token verified successfully');

		// Mint a fresh access token and attach it to the request object so
		// subsequent middleware / route handlers can forward it to the client.
		req.accessToken = generateAccessToken(decoded.userId, decoded.email);
		req.tokenRefreshNeeded = false;

		log.info('Access token refreshed successfully');

		return next();
	} catch (error: unknown) {
		// Missing cookie
		if (error instanceof MissingRefreshTokenError) {
			log.warn('Token refresh aborted - refresh token cookie missing');
			res.status(401).json({
				error: 'No refresh token provided',
			});
			return;
		}

		// Configuration error
		if (error instanceof MissingSecretError) {
			log.error(
				{ err: error },
				'Server misconfiguration - REFRESH_TOKEN_SECRET not set',
			);
			res.status(500).json({
				error: 'Internal server error',
			});
			return;
		}

		// JWT-specific errors from token
		if (error instanceof TokenExpiredError) {
			log.warn({ expiredAt: error.expiredAt }, 'Refresh token has expired');
			res.status(401).json({
				error: 'Refresh token expired',
				message: 'Please login again',
			});
			return;
		}

		if (error instanceof JsonWebTokenError) {
			log.warn({ err: error }, 'Invalid refresh token signature or format');
			res.status(401).json({
				error: 'Invalid refresh token',
			});
			return;
		}

		if (error instanceof Error) {
			// Unexpected / unclassified errors
			log.error({ err: error }, 'Unexpected error during token refresh');
			res.status(500).json({
				error: 'Token refresh failed',
				// Avoid leaking raw error messages in production.
				...(process.env.NODE_ENV !== 'production' && {
					message: error.message,
				}),
			});
			return;
		}

		// Non-Error throws (strings, objects, etc.)
		log.error({ err: error }, 'Unknown non-Error thrown during token refresh');
		res.status(500).json({ error: 'Token refresh failed' });
	}
};

export default refreshAccessToken;
