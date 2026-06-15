'use client';

import useApiQuery from '../core/useApiQuery';
import useApiMutation from '../core/useApiMutation';
import { AUTH_ROUTES } from 'src/constants/routes.constant';
import { ROOM_ROUTES } from 'src/constants/routes.constant';

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

export function useGetOnboardingData() {
	return useApiQuery({
		serverUrl: process.env.NEXT_PUBLIC_ONBOARDING_SERVER,
		url: ROOM_ROUTES.ONBOARD,
		requiresAuth: process.env.NODE_ENV === 'production',
		enabled: false, // Don't auto-fetch on mount, only when manually triggered
	});
}

export function useJoinRoom() {
	return useApiMutation<unknown, JoinRoomRequest>({
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
