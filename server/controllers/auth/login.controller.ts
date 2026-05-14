import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { User } from '../../models/User';
import { issueAuthResponse } from './auth.helpers';
import logger from '@shared/util/logger';
import { RedisFactory } from 'services/redis/RedisFactory';
import { RedisClients } from '@shared/constants/socketIoConstants';

const log = logger.child({ method: 'login' });

/**
 * Tracks a login event in a per-user Redis bitmap.
 * Each bit position represents a day since RETENTION_EPOCH, so
 * BITCOUNT gives total active days and range queries are cheap.
 *
 * Key: user:retention:{userId}
 */
const RETENTION_EPOCH = new Date('2024-01-01').getTime();

const trackRetention = async (userId: string): Promise<void> => {
	const dayIndex = Math.floor((Date.now() - RETENTION_EPOCH) / 86_400_000);
	const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();
	// redis.setBit(`user:retention:${userId}`, dayIndex, 1);
};

/**
 * Validates credentials and issues an auth response (tokens + cookie).
 */
const login = async (req: Request, res: Response): Promise<void> => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });

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

		// Fire-and-forget — retention tracking should never block the login response
		trackRetention(String(user._id)).catch((err) =>
			log.error(
				{ err, userId: String(user._id) },
				'Failed to track retention bitmap',
			),
		);

		log.info({ userId: String(user._id) }, 'User logged in');
		issueAuthResponse(user, res);
	} catch (error: unknown) {
		log.error({ err: error, email }, 'Unexpected error during login');
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export default login;
