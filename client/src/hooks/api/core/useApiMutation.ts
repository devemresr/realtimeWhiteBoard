'use client';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api-client';

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GET';

type MutationConfig<
	TData = unknown,
	TVariables = unknown,
	TError = ApiError,
> = {
	method: HttpMethod;
	url: string;
	serverUrl?: string;
	mutationOptions?: Omit<
		UseMutationOptions<TData, TError, TVariables>,
		'mutationFn'
	>;
};

export default function useApiMutation<
	// shape of the data returned by the API response
	TData = unknown,
	// shape of the request body sent to the API (use void if no body needed)
	TVariables = unknown,
	// shape of the error returned by the API, defaults to ApiError
	TError extends ApiError = ApiError,
>(config: MutationConfig<TData, TVariables, TError>) {
	return useMutation<TData, TError, TVariables>({
		mutationFn: async (variables: TVariables): Promise<TData> => {
			return apiFetch<TData>(config.url, {
				method: config.method,
				body: variables,
			});
		},
		...config.mutationOptions,
	});
}
