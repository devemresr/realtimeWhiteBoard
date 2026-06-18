import { create } from 'zustand';

export type RoomStatusState = {
	roomId: string;
	role: string;
	createdBy: string;
	maxMemberCount?: number;
	status: string;
	name: string;
	description: string;
};

export type RoomStatusActions = {
	setRoom: (room: Partial<RoomStatusState>) => void;
	resetRoom: () => void;
};

const initialState: RoomStatusState = {
	roomId: '',
	role: '',
	createdBy: '',
	maxMemberCount: 0,
	description: '',
	name: '',
	status: '',
};
export const useRoomStatusStore = create<RoomStatusState & RoomStatusActions>(
	(set) => ({
		...initialState,

		setRoom: (room) =>
			set((state) => ({
				...state,
				...room,
			})),

		resetRoom: () => set(initialState),
	}),
);
