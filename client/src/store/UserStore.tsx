import { create } from 'zustand';
import { UserActions, UserState } from './types';

const initialState: UserState = {
	id: '',
	name: '',
	username: '',
	email: '',
	avatar: '',
};

export const useUserStore = create<UserState & UserActions>((set) => ({
	...initialState,
	setUser: (user) => set(() => ({ ...user })),
	resetUser: () => set(() => initialState),
}));
