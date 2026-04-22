'use client';

import useApiQuery, { QueryConfig } from '../core/useApiQuerry';
import useApiMutation from '../core/useApiMutation';
import { AUTH_ROUTES, CANVAS_ROUTES } from './constants';

export type UserRegistrationRequest = {
	password: string;
	email: string;
};

export type UserRegistrationResponse = {
	id: string;
	accessToken: string;
	message: string;
};

export function useRegisterUser() {
	return useApiMutation<UserRegistrationResponse, UserRegistrationRequest>({
		url: AUTH_ROUTES.REGISTER,
		method: 'POST',
	});
}

export function useLogin() {
	return useApiMutation<UserRegistrationResponse, UserRegistrationRequest>({
		url: AUTH_ROUTES.LOGIN,
		method: 'POST',
	});
}

export function useGetOnboardingData() {
	return useApiQuery({
		serverUrl: process.env.NEXT_PUBLIC_ONBOARDING_SERVER,
		url: CANVAS_ROUTES.ONBOARD,
		requiresAuth: process.env.NODE_ENV === 'production',
		enabled: false, // Don't auto-fetch on mount, only when manually triggered
	});
}

export function useJoinRoom() {
	return useApiMutation({
		url: CANVAS_ROUTES.ROOMS.JOIN_ROOM,
		method: 'POST',
	});
}
export function useCreateRoom() {
	return useApiMutation({
		url: CANVAS_ROUTES.ROOMS.CREATE_ROOM,
		method: 'POST',
	});
}

export function useGetMissingPacket() {
	return useApiQuery({
		url: CANVAS_ROUTES.GET_MISSING_PACKET,
		requiresAuth: process.env.NODE_ENV === 'production',
	});
}

export function testProtectedRoute(config: QueryConfig) {
	return useApiQuery({
		url: config.url,
		requiresAuth: config.requiresAuth ?? false,
		enabled: config.enabled ?? false,
		params: config.params,
	});
}
