import mongoose, { Types } from 'mongoose';
import { DocumentWithTimestamps } from './RoomMetadata';

const { Schema } = mongoose;

const userSchema = new Schema<UserData>(
	{
		password: { type: String, required: true, select: false },
		name: { type: String, required: true },
		username: { type: String, required: true },
		surname: { type: String, required: true },
		avatarUrl: { type: String, required: false },
		email: { type: String, required: true, unique: true },
	},
	{ timestamps: true, collection: 'users' },
);

export const User = mongoose.model<UserData>('User', userSchema);

export type UserData = {
	email: string;
	password: string;
	name: string;
	avatarUrl: string;
	surname: string;
	username: string;
};

export type TimeStampedUser = DocumentWithTimestamps<UserData> & {
	_id: Types.ObjectId;
};
export type PublicUser = Omit<UserData, 'password' | '__v'> & {
	_id: Types.ObjectId;
};
