import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRE_TIMES } from './constants/jwtConstants';
const { nanoid } = require('nanoid');

export const generateAccessToken = (userId: string, email: string) => {
	if (!process.env.ACCESS_TOKEN_SECRET) {
		throw new Error('environment variable ACCESS_TOKEN_SECRET is not set');
	}
	const accessToken = jwt.sign(
		{
			userId,
			email,
			jti: nanoid(),
		},
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: JWT_EXPIRE_TIMES.ACCESSTOKEN },
	);

	return accessToken;
};

export const cookieOptions = {
	httpOnly: true,
	maxAge: 1000 * 60 * 60 * 24 * 30,
	sameSite: 'lax' as const,
	path: '/',
	secure: process.env.NODE_ENV === 'production',
};

export const setRefreshTokenCookie = (
	userId: string,
	email: string,
	res: Response,
) => {
	const refreshToken = generateRefreshToken(userId, email);
	res.cookie('jwt', refreshToken, cookieOptions);
};

const generateRefreshToken = (userId: string, email: string) => {
	if (!process.env.REFRESH_TOKEN_SECRET) {
		throw new Error('environment variable REFRESH_TOKEN_SECRET is not set');
	}
	const refreshToken = jwt.sign(
		{
			userId,
			email,
			jti: nanoid(),
		},
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: JWT_EXPIRE_TIMES.REFRESHTOKEN },
	);
	return refreshToken;
};
