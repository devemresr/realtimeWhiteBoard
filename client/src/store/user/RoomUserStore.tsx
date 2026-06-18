import { create } from 'zustand';

export type RoomUser = {
	userId: string;
	role?: string;
	avatarUrl?: string;
	name: string;
	surname: string;
	email: string;
	username: string;
	[key: string]: unknown;
};

type RoomUsersStore = {
	users: RoomUser[];
	memberCount: number;

	setUsers: (users: RoomUser[]) => void;
	addUser: (user: RoomUser) => void;
	removeUser: (userId: string) => void;
	updateUser: (userId: string, patch: Partial<RoomUser>) => void;
	clearUsers: () => void;
};

export const useRoomUsersStore = create<RoomUsersStore>((set) => ({
	users: [],
	memberCount: 0,

	setUsers: (users) =>
		set({
			users,
			memberCount: users.length,
		}),

	addUser: (user) =>
		set((state) => {
			const exists = state.users.some((u) => u.userId === user.userId);

			const users = exists
				? state.users.map((u) =>
						u.userId === user.userId ? { ...u, ...user } : u,
					)
				: [...state.users, user];

			return {
				users,
				memberCount: users.length,
			};
		}),

	removeUser: (userId) =>
		set((state) => {
			const users = state.users.filter((u) => u.userId !== userId);

			return {
				users,
				memberCount: users.length,
			};
		}),

	updateUser: (userId, patch) =>
		set((state) => ({
			users: state.users.map((user) =>
				user.userId === userId ? { ...user, ...patch } : user,
			),
		})),

	clearUsers: () =>
		set({
			users: [],
			memberCount: 0,
		}),
}));
