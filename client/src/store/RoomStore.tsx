import { create } from 'zustand';

export type RoomStatusState = {
	roomId: string;
	role: string;
	createdBy: string;
};

export type RoomStatusActions = {
	setRoom: (room: Partial<RoomStatusState>) => void;
	resetRoom: () => void;
};

const initialState: RoomStatusState = {
	roomId: '',
	role: '',
	createdBy: '',
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
