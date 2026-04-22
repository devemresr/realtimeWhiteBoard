import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
	password: { type: String, required: true },
	email: { type: String, requried: true, unique: true },
});

export type UserData = {
	email: string;
	userId: string;
};

export const Users = mongoose.model('Users', userSchema);
