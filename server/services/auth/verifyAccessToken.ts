import TokenBlacklist from 'services/redis/TokenBlacklist';
import { MissingSecretError } from './refreshAccessToken.middleware';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { TokenPayload } from '@shared/util/parseAccessToken';

export type VerifyTokenResult =
	| { status: 'valid'; userId: string; jti: string }
	| { status: 'refresh'; userId?: string }
	| { status: 'invalid' };

export const verifyAccessToken = async (
	accessToken: string | null,
	tokenBlacklist: TokenBlacklist,
): Promise<VerifyTokenResult> => {
	if (!process.env.ACCESS_TOKEN_SECRET) {
		throw new MissingSecretError(
			'ACCESS_TOKEN_SECRET environment variable is not set',
		);
	}

	if (!accessToken) {
		return { status: 'invalid' };
	}

	try {
		const decoded = jwt.verify(
			accessToken,
			process.env.ACCESS_TOKEN_SECRET,
		) as TokenPayload;

		const isRevoked = await tokenBlacklist.isTokenRevoked(decoded.jti);
		if (isRevoked) return { status: 'refresh', userId: decoded.userId };

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
