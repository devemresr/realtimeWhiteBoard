import pkg from 'bcryptjs';
const { hash, compare } = pkg;
import { Users } from '../models/Users';
import { Request, Response } from 'express';
import {
	generateAccessToken,
	generateRefreshToken,
	setRefreshTokenCookie,
} from '../utils/generateTokens';

const register = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		const existingUser = await Users.findOne({
			email,
		});

		if (existingUser) {
			return res.status(409).json({
				message: 'email has to be unique',
			});
		}

		const hashedPassword = await hash(password, 10);
		req.body.password = hashedPassword;
		const newUser = await Users.create(req.body);
		const userId = newUser._id.toHexString();

		const accessToken = generateAccessToken(userId, email);
		const refreshToken = generateRefreshToken(userId, email);
		setRefreshTokenCookie(refreshToken, res);

		res.status(200).json({
			accessToken: accessToken,
			message: 'successful register',
		});
	} catch (error: any) {
		// Handle race condition duplicate key error
		if (error?.code === 11000) {
			return res.status(409).json({ message: 'Email already registered' });
		}
		res.status(500).json({ message: error });
	}
};

export default register;
