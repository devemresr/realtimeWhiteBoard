import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_EXPIRE_TIMES } from '../../shared/constants/jwtConstants';

export const generateAccessToken = (userId: string, email: string) => {
	if (!process.env.ACCESS_TOKEN_SECRET) {
		throw new Error('environment variable ACCESS_TOKEN_SECRET is not set');
	}
	const accessToken = jwt.sign(
		{
			userId,
			email,
			jti: uuidv4(),
		},
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: JWT_EXPIRE_TIMES.ACCESSTOKEN }
	);

	return accessToken;
};

export const setRefreshTokenCookie = (refreshToken: string, res: Response) => {
	res.cookie('jwt', refreshToken, {
		httpOnly: true,
		maxAge: 1000 * 60 * 60 * 30, // 30 days
		sameSite: 'lax',
		path: '/',
		secure: process.env.ENVIRONMENT === 'development' ? false : true,
	});
};

export const generateRefreshToken = (userId: string, email: string) => {
	if (!process.env.REFRESH_TOKEN_SECRET) {
		throw new Error('environment variable REFRESH_TOKEN_SECRET is not set');
	}
	const refreshToken = jwt.sign(
		{
			userId,
			email,
			jti: uuidv4(),
		},
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: JWT_EXPIRE_TIMES.REFRESHTOKEN }
	);
	return refreshToken;
};
