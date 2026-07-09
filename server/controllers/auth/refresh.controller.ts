import { Request, Response } from 'express';
import { cacheUser, getCachedUser, requireUserId } from './auth.helpers';
import logger from 'utils/logger';
import { PublicUser, User } from 'models/User';
import {
	cookieOptions,
	generateAccessToken,
} from 'services/auth/generateTokens.service';
import { runRedisCommandAndParse } from 'utils/parseRedisFields';
const log = logger.child({ method: 'refresh' });
const refresh = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = requireUserId(req);
		log.child({ userId });
		log.info('refresh request');

		const user = (await runRedisCommandAndParse(() =>
			getCachedUser(userId),
		)) as PublicUser;
		if (!user) {
			const user = await User.findById(userId)
				.select('-password -__v -createdAt -updatedAt')
				.lean<PublicUser>();
			if (!user) {
				res.clearCookie('jwt', cookieOptions);
				res.status(401).json({ success: false, message: 'Invalid session' });
				return;
			}

			await cacheUser(user);
			const accessToken = generateAccessToken(userId, user.email);
			res.status(200).json({
				success: true,
				accessToken,
				user: user,
			});
			return;
		}
		const accessToken = generateAccessToken(userId, user.email);
		log.debug('refresh request successful');
		res.status(200).json({
			success: true,
			accessToken,
			user,
		});
	} catch {
		res.clearCookie('jwt', cookieOptions);
		res.status(401).json({ success: false, message: 'Invalid session' });
	}
};

export default refresh;
