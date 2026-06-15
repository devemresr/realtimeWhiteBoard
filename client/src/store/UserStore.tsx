import { create } from 'zustand';
import { UserActions, UserState } from './types';

const initialState: UserState = {
	userId: '',
	name: '',
	username: '',
	email: '',
	avatarUrl: '',
	surname: '',
};

export const useUserStore = create<UserState & UserActions>((set, get) => ({
	...initialState,
	setUser: (user) =>
		set((state) => ({
			...state,
			...user,
		})),
	resetUser: () => set(() => initialState),
}));
