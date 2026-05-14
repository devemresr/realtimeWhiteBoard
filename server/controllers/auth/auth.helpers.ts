import { UserData } from 'models/User';
import {
	generateAccessToken,
	setRefreshTokenCookie,
} from 'services/auth/generateTokens.service';
import { Response } from 'express';
import { HydratedDocument } from 'mongoose';

export const issueAuthResponse = (
	user: HydratedDocument<UserData>,
	res: Response,
) => {
	try {
		const { email } = user;
		const userId = user._id.toHexString();

		const accessToken = generateAccessToken(userId, email);
		setRefreshTokenCookie(userId, email, res);
		return res.status(200).json({ accessToken });
	} catch (error) {
		return res.status(500).json({ message: 'Authentication response failed' });
	}
};
