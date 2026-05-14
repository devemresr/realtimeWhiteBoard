import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema(
	{
		password: { type: String, required: true },
		name: { type: String, required: true },
		surname: { type: String, required: true },
		email: { type: String, required: true, unique: true },
	},
	{ timestamps: true, collection: 'users' },
);

export const User = mongoose.model<UserData, mongoose.Model<UserData>>(
	'User',
	userSchema,
);

export type UserData = {
	email: string;
	password: string;
	name: string;
	surname: string;
	userId: string;
};
