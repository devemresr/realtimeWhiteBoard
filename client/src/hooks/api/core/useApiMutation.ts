'use client';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api-client';

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type MutationConfig<
	TData = unknown,
	TVariables = unknown,
	TError = ApiError,
> = {
	method: HttpMethod;
	url: string;
	mutationOptions?: Omit<
		UseMutationOptions<TData, TError, TVariables>,
		'mutationFn'
	>;
};

export default function useApiMutation<
	TData = unknown,
	TVariables = unknown,
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
