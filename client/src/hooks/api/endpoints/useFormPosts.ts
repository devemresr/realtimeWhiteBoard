'use client';

import useApiQuery from '../core/useApiQuery';
import useApiMutation from '../core/useApiMutation';
import { AUTH_ROUTES } from 'src/constants/routes.constant';
import { ROOM_ROUTES } from 'src/constants/routes.constant';
import { Role, RoomStatus } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../core/api-client';

// todo fix: tpyes are not correct

export type AuthRequest = {
	password: string;
	email: string;
};
export type UserRegistrationRequest = AuthRequest & {
	name: string;
	surname: string;
	username: string;
	avatarUrl: string;
};

export type userData = UserRegistrationRequest & {
	email: string;
	_id: string;
};

// todo add these
// export type GetRoomsResponse = {
// 	rooms: RoomListItem[];
// };

export type JoinRoomRequest = {
	roomId: string;
	role?: string;
	password?: string;
};
export type JoinRoomResponse = {
	roomId: string;
	role?: string;
	status: RoomStatus;
};

export type AuthResponse = {
	accessToken: string;
	user: userData;
};

export function useRegister() {
	return useApiMutation<AuthResponse, UserRegistrationRequest>({
		url: AUTH_ROUTES.REGISTER,
		method: 'POST',
	});
}

export function useLogin() {
	return useApiMutation<AuthResponse, AuthRequest>({
		url: AUTH_ROUTES.LOGIN,
		method: 'POST',
	});
}
export function useLogout() {
	return useApiMutation({
		url: AUTH_ROUTES.LOGOUT,
		method: 'POST',
	});
}

export function useGetOnboardingData() {
	return useMutation({
		mutationFn: async (roomId: string) => {
			return apiFetch(`/onboard/${roomId}`, {
				method: 'GET',
				serverUrl: process.env.NEXT_PUBLIC_ONBOARDING_SERVER,
			});
		},
	});
}

export function useJoinRoom() {
	return useApiMutation<JoinRoomResponse, JoinRoomRequest>({
		url: ROOM_ROUTES.JOIN,
		method: 'POST',
	});
}
export function useCreateRoom() {
	return useApiMutation({
		url: ROOM_ROUTES.CREATE,
		method: 'POST',
	});
}

export function useRefresh() {
	return useApiMutation<AuthResponse>({
		url: AUTH_ROUTES.REFRESH,
		method: 'POST',
	});
}
export function useUserUpdate() {
	return useApiMutation<AuthResponse>({
		url: AUTH_ROUTES.UPDATE,
		method: 'PATCH',
	});
}

export function useGetMissingPacket() {
	return useApiQuery({
		url: ROOM_ROUTES.GET_MISSING_PACKET,
		requiresAuth: process.env.NODE_ENV === 'production',
	});
}
export function useGetRooms() {
	return useApiQuery({
		url: ROOM_ROUTES.LIST_ACTIVE,
		requiresAuth: process.env.NODE_ENV === 'production',
	});
}
export const useChangeRoomStatus = () => {
	return useApiMutation<
		{
			success: boolean;
			roomId: string;
			roomStatus: RoomStatus;
		},
		{
			roomId: string;
			roomStatus: RoomStatus;
		}
	>({
		url: '/room/status',
		method: 'PATCH',
	});
};

const getRoomUsersUrl = (roomId: string) => `/rooms/${roomId}/users`;

// must mirror useApiQuery's internal key derivation ([url, params ?? null])
// so setQueryData calls from the join mutation / socket sync land on the
// same cache entry this hook reads from
export const getRoomUsersQueryKey = (roomId: string) =>
	[getRoomUsersUrl(roomId), null] as const;

export type RoomUser = {
	userId: string;
	role: Role;
	username?: string;
	displayName?: string;
	email?: string;
	avatar?: string;
	isOnline?: boolean;
	joinedAt?: string;
};
export function useRoomUsers(roomId: string) {
	return useApiQuery<RoomUser[]>({
		url: getRoomUsersUrl(roomId),
		requiresAuth: true,
		enabled: !!roomId,
		queryOptions: {
			staleTime: Infinity, // join response + sockets keep this fresh, no polling
		},
	});
}
