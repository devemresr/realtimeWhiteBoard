'use client';

import useApiMutation from './useMutation';
import useApiQuery, { QueryConfig } from './useApiQuerry';

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
		url: '/auth/register',
		method: 'POST',
	});
}

export function useLogin() {
	return useApiMutation<UserRegistrationResponse, UserRegistrationRequest>({
		url: '/auth/login',
		method: 'POST',
	});
}

export function useGetOnboardingData(apiType?: string) {
	return useApiMutation({
		url: '/onboard',
		method: 'GET',
		...(apiType && { apiType }),
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
