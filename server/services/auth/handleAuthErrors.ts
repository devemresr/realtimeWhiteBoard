// Single catch-all dispatcher. Every middleware funnels into here - no

import { Response } from 'express';
import { Logger } from 'pino';
import {
	AuthError,
	ExpiredRefreshTokenError,
	InvalidRefreshToken,
} from './auth.errors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// duplicated status/message logic scattered across handlers.
export const handleAuthError = (
	error: unknown,
	res: Response,
	log: Logger,
): void => {
	// Known auth errors carry their own status and message - dispatch directly.
	if (error instanceof AuthError) {
		log.warn({ err: error }, error.message);
		res.status(error.statusCode).json({ error: error.clientMessage });
		return;
	}

	if (error instanceof TokenExpiredError) {
		const mapped = new ExpiredRefreshTokenError();
		log.warn({ err: mapped }, mapped.message);
		res.status(mapped.statusCode).json({ error: mapped.clientMessage });
		return;
	}

	if (error instanceof JsonWebTokenError) {
		return handleAuthError(new InvalidRefreshToken(), res, log);
	}

	// Unexpected / unclassified errors
	if (error instanceof Error) {
		log.error({ err: error }, 'Unexpected auth error');
		res.status(500).json({
			error: 'Internal server error',
			...(process.env.NODE_ENV !== 'production' && {
				message: error.message,
			}),
		});
		return;
	}

	// Non-Error throws (strings, objects, etc.)
	log.error({ err: error }, 'Unknown non-Error thrown');
	res.status(500).json({ error: 'Internal server error' });
};
