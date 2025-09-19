import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import TokenStore from '../services/TokenStore';
import { AccessTokenPayload } from './refreshAccessToken';

const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;
		const refreshToken = req.cookies.jwt;
		if (!refreshToken) {
			throw new Error('no refreshToken provided');
		}

		let headerValue: string | undefined;

		if (Array.isArray(authHeader)) {
			headerValue = authHeader[0];
		} else {
			headerValue = authHeader;
		}

		if (
			!headerValue ||
			typeof headerValue !== 'string' ||
			!headerValue.startsWith('Bearer ')
		) {
			req.tokenRefreshNeeded = true;
			return next();
		}

		const accessToken: string = headerValue!.split(' ')[1];
		console.log('accessToken in verify', accessToken);

		if (!accessToken) {
			req.tokenRefreshNeeded = true;
			return next();
		}

		if (!process.env.ACCESS_TOKEN_SECRET) {
			throw new Error('environment variable ACCESS_TOKEN_SECRET is not set');
		}
		const tokenStore = new TokenStore();
		try {
			// const decodedAccessToken: AccessTokenPayload = jwt.verify(
			const decodedAccessToken = jwt.verify(
				accessToken,
				process.env.ACCESS_TOKEN_SECRET
			) as AccessTokenPayload;

			const isTokenBlacklisted = await tokenStore.isTokenRevoked(
				(decodedAccessToken as AccessTokenPayload).jti
			);
			if (isTokenBlacklisted) {
				req.accessToken = accessToken;
				req.tokenRefreshNeeded = true;
				req.tokenIsBlacklisted = true;
				return next();
			}
		} catch (error: any) {
			if (error.name === 'TokenExpiredError' && refreshToken) {
				req.accessToken = accessToken;
				req.tokenRefreshNeeded = true;
				return next();
			}
			throw error;
		}

		req.accessToken = accessToken;
		req.tokenRefreshNeeded = false;
		return next();
	} catch (error: any) {
		console.log('error:', error);
		return res.status(401).json({ error: 'Invalid token' });
	}
};

export default verifyJWT;
