import mongoose, { Schema } from 'mongoose';
import { DocumentWithTimestamps } from './RoomMetadata';

export interface RoomData {
	// identifiers
	roomId: string;
	createdBy: string;

	// room states
	roomStatus: 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
	banned: string[];
}
const RoomSchema = new Schema<RoomData>(
	{
		// identifiers
		createdBy: { type: String, required: true },
		roomId: { type: String, required: true },

		// room states
		roomStatus: {
			type: String,
			enum: ['ACTIVE', 'LOCKED', 'ARCHIVED'],
			required: true,
			default: 'ACTIVE',
		},
		banned: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

export default mongoose.model<RoomData>('Room', RoomSchema);
export type TimestampedRoom = DocumentWithTimestamps<RoomData>;
