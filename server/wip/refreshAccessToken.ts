import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../utils/generateTokens';
import { UserData, Users } from '../models/Users';
import { Types } from 'mongoose';
import FindTheUser from '../services/FindTheUser';

type RefreshPayload = {
	userId: string;
};

export type AccessTokenPayload = {
	userId: string;
	jti: string;
	email: string;
};

export type UserDocument = {
	_id: Types.ObjectId;
	email: string;
	[key: string]: any;
};

// Helper function to extract user info for token generation
function getUserInfoForToken(
	userInfo: AccessTokenPayload | UserData | NonNullable<UserDocument>
): { userId: string; email: string } {
	if (userInfo && typeof userInfo === 'object' && 'jti' in userInfo) {
		// It's an AccessTokenPayload
		return {
			userId: userInfo.userId,
			email: userInfo.email,
		};
	} else if (userInfo && typeof userInfo === 'object' && '_id' in userInfo) {
		// It's a User document from database
		return {
			userId: userInfo._id.toString(),
			email: userInfo.email as string,
		};
	} else {
		// It's UserData type
		return {
			userId: (userInfo as UserData).userId,
			email: (userInfo as UserData).email,
		};
	}
}

const refreshAccessToken = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	console.log('tokenRefreshNeeded', req.tokenRefreshNeeded);

	if (!req.tokenRefreshNeeded) {
		return next();
	}

	try {
		const cookies = req.cookies;
		const refreshToken = cookies.jwt;

		if (!refreshToken) {
			return res.status(401).json({
				error: 'No refresh token provided',
			});
		}

		if (!process.env.REFRESH_TOKEN_SECRET) {
			throw new Error(
				'REFRESH_TOKEN_SECRET environment variable hasnt been set'
			);
		}

		const decodedRefreshToken = jwt.verify(
			refreshToken,
			process.env.REFRESH_TOKEN_SECRET
		) as RefreshPayload;

		let accessToken = req.accessToken;
		let userInfo: AccessTokenPayload | UserDocument | UserData | null = null;

		const findTheUser = new FindTheUser();

		console.log('req.accessToken IN REFRESH', req.accessToken);
		if (accessToken) {
			console.log('Processing existing access token');
			const decodedAccessToken = jwt.decode(accessToken) as AccessTokenPayload;

			const isAccessTokenRevoked = req.tokenIsBlacklisted;
			console.log('tokenIsBlacklisted', req.tokenIsBlacklisted);

			if (isAccessTokenRevoked) {
				// Token was revoked, get fresh user data from database/cache
				console.log('token is revoked');

				userInfo = (await findTheUser.checkBoth(decodedAccessToken.userId)) as
					| UserDocument
					| UserData;
			} else {
				// Token wasn't revoked, just expired - reuse the decoded data
				console.log(
					'token isnt revoked just expired gonna use the old decodedAccessToken'
				);
				userInfo = decodedAccessToken;
			}
		} else {
			// No existing access token, get user data from database/cache
			console.log('no token gonna lookup to cache/db');
			userInfo = (await findTheUser.checkBoth(decodedRefreshToken.userId)) as
				| UserDocument
				| UserData;
		}

		if (!userInfo) {
			throw new Error('Invalid credentials');
		}

		// Extract the correct userId and email regardless of userInfo type
		const tokenData = getUserInfoForToken(userInfo);
		accessToken = generateAccessToken(tokenData.userId, tokenData.email);

		req.accessToken = accessToken;
		req.tokenRefreshNeeded = false;
		return next();
	} catch (error: any) {
		console.error('Token refresh error:', error);

		if (error.name === 'TokenExpiredError') {
			return res.status(401).json({
				error: 'Refresh token expired',
				message: 'Please login again',
			});
		}

		if (error.name === 'JsonWebTokenError') {
			return res.status(401).json({
				error: 'Invalid refresh token',
			});
		}

		if (
			error.message === 'no user found' ||
			error.message === 'Invalid credentials'
		) {
			return res.status(401).json({
				error: 'User not found',
				message: 'Please login again',
			});
		}

		// For other errors
		return res.status(500).json({
			error: 'Token refresh failed',
			message: error.message,
		});
	}
};

export default refreshAccessToken;
