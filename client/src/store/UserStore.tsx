import { create } from 'zustand';
import { UserActions, UserState } from './types';

const initialState: UserState = {
	id: '',
	name: '',
	username: '',
	email: '',
	avatar: '',
};

export const useUserStore = create<UserState & UserActions>((set, get) => ({
	...initialState,
	setUser: (user) => set(() => ({ ...user })),
	resetUser: () => set(() => initialState),
	loggedIn: () => !!get().id,
}));
