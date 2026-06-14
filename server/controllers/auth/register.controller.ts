import pkg from 'bcryptjs';
const { hashSync } = pkg;
import { Request, Response } from 'express';
import { PublicUser, User } from 'models/User';
import { cacheUser, issueAuthResponse, trackRetention } from './auth.helpers';
import logger from '@shared/util/logger';
const SALT_ROUNDS = 10;

const log = logger.child({ method: 'registerController' });

const register = async (req: Request, res: Response) => {
	try {
		const { email, password, name, surname, avatarUrl } = req.body;

		const isExistingUser = await User.findOne({
			email,
		});

		if (isExistingUser) {
			return res.status(409).json({
				message: 'email has to be unique',
			});
		}

		const hashedPassword = hashSync(password, SALT_ROUNDS);
		const newUser = await User.create({
			password: hashedPassword,
			email,
			name,
			surname,
			avatarUrl: avatarUrl ?? null,
		}).then((doc) => {
			const { __v, password, ...user } = doc.toObject();
			return user as PublicUser;
		});

		const userId = newUser._id.toString();
		// Fire-and-forget - retention tracking should never block the login response
		trackRetention(userId).catch((err) =>
			log.error({ err, userId }, 'Failed to track retention bitmap'),
		);
		await cacheUser(newUser);

		log.info(
			{ userId: newUser._id.toString(), email: newUser.email },
			'User registered',
		);
		return issueAuthResponse(newUser, res);
	} catch (error: any) {
		// Handle race condition duplicate key error
		if (error?.code === 11000) {
			return res.status(409).json({ message: 'Email already registered' });
		}
		log.debug({ error }, 'Unexpected error at register controller:');

		res.status(500).json({ message: error });
	}
};

export default register;
