import { MissingSecretError } from './auth.errors';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { TokenPayload } from 'utils/token.helpers';

export type VerifyTokenResult =
	| { status: 'valid'; userId: string; jti: string }
	| { status: 'refresh'; userId?: string }
	| { status: 'invalid' };

export const verifyAccessToken = async (
	accessToken: string | null,
): Promise<VerifyTokenResult> => {
	if (!accessToken) {
		return { status: 'refresh' };
	}

	if (!process.env.ACCESS_TOKEN_SECRET) {
		throw new MissingSecretError('ACCESS_TOKEN_SECRET');
	}

	try {
		const decoded = jwt.verify(
			accessToken,
			process.env.ACCESS_TOKEN_SECRET,
		) as TokenPayload;

		return { status: 'valid', userId: decoded.userId, jti: decoded.jti };
	} catch (error) {
		if (
			error instanceof TokenExpiredError ||
			error instanceof JsonWebTokenError
		) {
			try {
				const decoded = JSON.parse(atob(accessToken.split('.')[1]!));
				return { status: 'refresh', userId: decoded?.userId };
			} catch {
				return { status: 'refresh' };
			}
		}
		throw error;
	}
};
