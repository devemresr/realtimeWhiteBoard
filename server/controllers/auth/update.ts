import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../../models/User';
import logger from '@shared/util/logger';

type UpdateUserRequest = Partial<{
	name: string;
	surname: string;
	username: string;
	email: string;
	avatarUrl: string | null;
}>;

export const updateUser = async (req: Request, res: Response) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: 'Invalid user id' });
		}

		const allowedFields = [
			'name',
			'surname',
			'username',
			'email',
			'avatarUrl',
		] as const;

		const updates: UpdateUserRequest = {};

		for (const field of allowedFields) {
			const value = req.body?.[field];

			if (value !== undefined) {
				updates[field] = typeof value === 'string' ? value.trim() : value;
			}
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ message: 'No valid fields to update' });
		}

		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{ $set: updates },
			{
				new: true,
				runValidators: true,
			},
		).select('-password');

		if (!updatedUser) {
			return res.status(404).json({ message: 'User not found' });
		}

		return res.status(200).json({
			message: 'User updated successfully',
			user: updatedUser,
		});
	} catch (error: any) {
		if (error?.code === 11000) {
			const duplicateField = Object.keys(error.keyPattern ?? {})[0];

			return res.status(409).json({
				message: `${duplicateField} is already in use`,
			});
		}

		logger.error(error, 'Unexpected error at updateUser controller');

		return res.status(500).json({
			message: 'Could not update user',
		});
	}
};
