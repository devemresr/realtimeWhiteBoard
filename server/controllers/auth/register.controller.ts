import pkg from 'bcryptjs';
const { hashSync } = pkg;
import { Request, Response } from 'express';
import { User } from 'models/User';
import { issueAuthResponse } from './auth.helpers';
import logger from '@shared/util/logger';
const SALT_ROUNDS = 10;

const log = logger.child({ method: 'registerController' });

const register = async (req: Request, res: Response) => {
	try {
		log.debug('registerController');

		const { email, password, name, surname } = req.body;

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
		});

		return issueAuthResponse(newUser, res);
	} catch (error: any) {
		// Handle race condition duplicate key error
		if (error?.code === 11000) {
			return res.status(409).json({ message: 'Email already registered' });
		}
		log.debug({ error }, 'Unexpected error at register controller:');
		console.log('Unexpected error at register controller:', error);

		res.status(500).json({ message: error });
	}
};

export default register;
