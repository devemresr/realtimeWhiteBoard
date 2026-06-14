import mongoose, { Schema, Document } from 'mongoose';

// Base interface for data operations (insert, update)
export interface RoomMetaDataBase {
	roomId: string;

	// counters
	inflightAwaitingProcessingCount: number;
	persistedAwaitingSnapshotCount: number;
	snapshottedAwaitingPersistCount: number;
	completedProcessingCount: number;

	// snapshot tracking
	snapshotCount: number;
	snapshotTotalEventCount: number;

	// timestamps
	lastPersistedAt: Date;
	lastSnapshotAt: Date;
}

export interface RoomMetaData extends RoomMetaDataBase, Document {}

const RoomMetaDataSchema = new Schema<RoomMetaData>({
	inflightAwaitingProcessingCount: {
		type: Number,
		required: true,
		default: 0,
	},
	persistedAwaitingSnapshotCount: {
		type: Number,
		required: true,
		default: 0,
	},
	snapshottedAwaitingPersistCount: {
		type: Number,
		required: true,
		default: 0,
	},
	completedProcessingCount: { type: Number, required: true, default: 0 },
	roomId: { type: String, required: true },

	// snapshot tracking
	snapshotCount: { type: Number, required: true, default: 0 },
	snapshotTotalEventCount: { type: Number, required: true, default: 0 },

	// timestamps
	lastPersistedAt: { type: Date },
	lastSnapshotAt: { type: Date },
});

export default mongoose.model<RoomMetaData>('RoomMetaData', RoomMetaDataSchema);

export type DocumentWithTimestamps<T> = T & {
	createdAt: Date;
	updatedAt: Date;
};
export type TimestampedRoomMetadata = DocumentWithTimestamps<RoomMetaData>;
