'use client';

import { useMutation } from '@tanstack/react-query';

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type MutationConfig = {
	method: HttpMethod;
	url: string;
};

type ApiError = {
	message: string;
	status: number;
	statusText: string;
};

export default function useApiMutation<
	TData = any,
	TVariables = any,
	TError = any,
>(
	config: MutationConfig
	// TData is what we expect from the API call
	// TVariables is what we expect the caller to send to the API
) {
	return useMutation<TData, TError, TVariables>({
		mutationFn: async (variables: TVariables): Promise<TData> => {
			const accessToken =
				typeof window !== 'undefined'
					? localStorage.getItem('accessToken')
					: null;
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_DEV_SERVER_URL}${config.url}`,
				{
					method: config.method,
					headers: {
						...(accessToken && { Authorization: `Bearer ${accessToken}` }),
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify(variables),
				}
			);

			if (!response.ok) {
				throw {
					message: `HTTP error! status: ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				} as TError;
			}

			// Handle empty responses (like 204 No Content)
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.includes('application/json')) {
				return {} as TData;
			}

			const body = await response.json();
			if (body.accessToken) {
				localStorage.setItem('accessToken', body.accessToken);
			}

			return {
				status: response.status,
				statusText: response.statusText,
				...body,
			} as TData;
		},
	});
}
