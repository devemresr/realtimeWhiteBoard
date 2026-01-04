'use client';

import useApiQuery, { QueryConfig } from '../core/useApiQuerry';
import useApiMutation from '../core/useApiMutation';
import { AUTH, CANVAS } from './constants';

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
		url: AUTH.REGISTER,
		method: 'POST',
	});
}

export function useLogin() {
	return useApiMutation<UserRegistrationResponse, UserRegistrationRequest>({
		url: AUTH.LOGIN,
		method: 'POST',
	});
}

export function useGetOnboardingData() {
	return useApiQuery({
		url: CANVAS.ONBOARD,
		// todo dev purposes should be true
		requiresAuth: false,
		serverUrl: process.env.NEXT_PUBLIC_DEV_ONBOARDING_SERVER_URL,
		enabled: false, // Don't auto-fetch on mount, only when manually triggered
	});
}
export function useGetMissingPacket() {
	return useApiQuery({
		url: CANVAS.GET_MISSING_PACKET,
		// todo dev purposes should be true
		requiresAuth: false,
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
