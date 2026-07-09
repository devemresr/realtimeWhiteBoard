import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from './verifyAccessToken.service';
import { MissingSecretError } from './auth.errors';
import { handleAuthError } from './handleAuthErrors';
import logger from 'utils/logger';

const extractBearerToken = (authHeader: string | undefined): string | null => {
	if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
	return authHeader.split(' ')[1] ?? null;
};
const log = logger.child({ method: 'verifyJWT' });

/**
 * Factory that returns a JWT verification middleware bound to a TokenBlacklist instance.
 *
 * Flow:
 * - No refresh token cookie => 401 immediately, nothing to fall back to
 * - No / invalid Bearer token => flag for refresh, let refreshAccessToken handle it
 * - Valid token but blacklisted => flag for refresh
 * - Expired token => flag for refresh
 * - Valid, non-blacklisted token => attach to req and continue
 */
const verifyJwt = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Refresh token is present and live now evaluate the access token.
		const result = await verifyAccessToken(
			extractBearerToken(req.headers.authorization),
		);

		logger.debug({ result }, 'verifyjwt');

		switch (result.status) {
			case 'invalid':
				return res.status(401).json({ error: 'No access token provided' });
			case 'refresh':
				req.userId = result?.userId as string;
				req.tokenRefreshNeeded = true;
				return next();
			case 'valid':
				req.userId = result.userId;
				req.accessToken = extractBearerToken(req.headers.authorization)!;
				req.tokenRefreshNeeded = false;
				return next();
		}
	} catch (error) {
		handleAuthError(error, res, log);
	}
};

export default verifyJwt;
