import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { User } from '../../models/User';
import { cacheUser, issueAuthResponse, trackRetention } from './auth.helpers';
import logger from '@shared/util/logger';

const log = logger.child({ method: 'login' });

/**
 * Validates credentials and issues an auth response (tokens + cookie).
 */
const login = async (req: Request, res: Response): Promise<void> => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email }).select('+password -__v').lean();

		if (!user) {
			log.warn({ email }, 'Login attempt for non-existent user');
			res.status(404).json({
				success: false,
				message: 'Invalid credentials',
			});
			return;
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			log.warn({ email }, 'Login attempt with wrong password');
			res.status(401).json({
				success: false,
				message: 'Invalid credentials',
			});
			return;
		}

		// Fire-and-forget - retention tracking should never block the login response
		trackRetention(user._id.toString()).catch((err) =>
			log.error(
				{ err, userId: user._id.toString() },
				'Failed to track retention bitmap',
			),
		);

		await cacheUser(user);

		log.info({ userId: user._id.toString() }, 'User logged in');

		issueAuthResponse(user, res);
	} catch (error: unknown) {
		log.error({ err: error, email }, 'Unexpected error during login');
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export default login;
