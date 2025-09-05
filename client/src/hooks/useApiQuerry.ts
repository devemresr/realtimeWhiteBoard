'use client';
import { useQuery } from '@tanstack/react-query';

type ApiError = {
	message: string;
	status: number;
	statusText: string;
};

export type QueryConfig = {
	url: string;
	params?: Record<string, any>;
	requiresAuth: boolean;
	enabled?: boolean;
};

export default function useApiQuery<TData = any, TError = ApiError>(
	config: QueryConfig
) {
	const shouldDisableForSSR =
		config.requiresAuth && typeof window === 'undefined';
	const finalEnabled =
		config.enabled !== undefined
			? config.enabled && !shouldDisableForSSR
			: !shouldDisableForSSR;
	return useQuery<TData, TError>({
		queryKey: [config.url, config.params],
		queryFn: async () => {
			const accessToken =
				typeof window !== 'undefined'
					? localStorage.getItem('accessToken')
					: null;

			let queryString = '';
			if (config.params) {
				queryString =
					'?' +
					new URLSearchParams(
						Object.entries(config.params).reduce(
							(acc, [k, v]) => {
								console.log('acc', acc, 'k', k, 'v', v);
								acc[k] = String(v);
								return acc;
							},
							{} as Record<string, string>
						)
					).toString();
			}

			const headers: Record<string, string> = {};
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_DEV_SERVER_URL}${config.url}${queryString}`,
				{
					headers: {
						...(accessToken && { Authorization: `Bearer ${accessToken}` }),
						'Content-Type': 'application/json',
					},
					credentials: 'include',
				}
			);

			if (!response.ok) {
				throw {
					message: `HTTP error! status: ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				} as TError;
			}

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
		// because of the usage of localstorage inside of the function we selectively disable the fetcher
		enabled: finalEnabled,
	});
}
