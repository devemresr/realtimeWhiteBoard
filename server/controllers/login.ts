import { Users } from '../models/Users';
import pkg from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { Request, Response } from 'express';
import Joi from 'joi';
import {
	generateAccessToken,
	generateRefreshToken,
	setRefreshTokenCookie,
} from '../utils/generateTokens';
dotenv.config();
import validateInput from '../../shared/validation/validate';
import { loginSchemas } from '../../shared/validation/schemas/authSchemas';
interface LoginData {
	email: string;
	password: string;
}

const login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		// Usage:
		const result = validateInput<LoginData>(req.body, loginSchemas);
		if (!result.success) {
			console.log('result: ', result);
			return res.status(400).json(result.errors);
		}

		const user = await Users.findOne({ email });
		if (!user) {
			return res.status(404).json({
				success: false,
				result: null,
				message: 'user havent found',
			});
		}

		const isMatch = await pkg.compare(password, user.password);

		if (!isMatch) {
			return res.status(403).json({
				success: false,
				result: null,
				message: 'invalid credantials',
			});
		}

		const userId = user._id.toHexString();
		const accessToken = generateAccessToken(userId, email);
		// todo should blacklist the old tokens
		const refreshToken = generateRefreshToken(userId, email);
		setRefreshTokenCookie(refreshToken, res);

		return res.status(200).json({
			accessToken: accessToken,
			message: 'succesfull login',
		});
	} catch (error) {
		console.log('error', error);
		return res.status(500).json({
			message: error,
		});
	}
};

export default login;
