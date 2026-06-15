// import mongoose, { Schema } from 'mongoose';
// import { DocumentWithTimestamps } from './RoomMetadata';

// export interface RoomData {
// 	// identifiers
// 	roomId: string;
// 	createdBy: string;

// 	// room states
// 	roomStatus: 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
// 	banned: string[];
// }
// const RoomSchema = new Schema<RoomData>(
// 	{
// 		// identifiers
// 		createdBy: { type: String, required: true },
// 		roomId: { type: String, required: true },

// 		// room states
// 		roomStatus: {
// 			type: String,
// 			enum: ['ACTIVE', 'LOCKED', 'ARCHIVED'],
// 			required: true,
// 			default: 'ACTIVE',
// 		},
// 		banned: { type: [String], required: true, default: [] },
// 	},
// 	{ timestamps: true },
// );

// export default mongoose.model<RoomData>('Room', RoomSchema);
// export type TimestampedRoom = DocumentWithTimestamps<RoomData>;
import mongoose, { Schema } from 'mongoose';
import { DocumentWithTimestamps } from './RoomMetadata';

export interface RoomData {
	// identifiers
	roomId: string;
	createdBy: string;

	// metadata
	name: string;
	description?: string;

	// room states
	roomStatus: 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
	isLocked: boolean;
	banned: string[];

	// limits
	maxMembers?: number;
}

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

		// room states
		roomStatus: {
			type: String,
			enum: ['ACTIVE', 'LOCKED', 'ARCHIVED'],
			required: true,
			default: 'ACTIVE',
		},

		isLocked: {
			type: Boolean,
			required: true,
			default: false,
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
