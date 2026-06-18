import mongoose, { Schema } from 'mongoose';
import { DocumentWithTimestamps } from './RoomMetadata';
import { RoomData, RoomStatus } from '@/types';

const RoomSchema = new Schema<RoomData>(
	{
		// identifiers
		roomId: {
			type: String,
			required: true,
			unique: true,
		},

		createdBy: {
			type: String,
			required: true,
		},

		// metadata
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: 100,
		},

		description: {
			type: String,
			required: false,
			trim: true,
			maxlength: 500,
			default: '',
		},

		password: {
			type: String,
			required: false,
			default: null,
		},

		// room states
		roomStatus: {
			type: String,
			enum: Object.values(RoomStatus),
			required: true,
			default: RoomStatus.ACTIVE,
		},

		banned: {
			type: [String],
			required: true,
			default: [],
		},

		// limits
		maxMembers: {
			type: Number,
			required: false,
			min: 2,
			default: null,
		},
	},
	{
		timestamps: true,
	},
);

export default mongoose.model<RoomData>('Room', RoomSchema);

export type TimestampedRoom = DocumentWithTimestamps<RoomData>;
