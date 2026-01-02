'use client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

type ApiError = {
	message: string;
	status: number;
	statusText: string;
};

export type RetryConfig = {
	enabled?: boolean;
	maxRetries?: number;
	retryDelay?: number | ((attempt: number) => number);
	retryableStatuses?: number[];
};

export type QueryConfig<TData = unknown, TError extends ApiError = ApiError> = {
	url: string;
	params?: Record<string, unknown>;
	requiresAuth: boolean;
	enabled?: boolean;
	retry?: RetryConfig;
	queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
};

// Default retry configuration
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
	enabled: true,
	maxRetries: 3,
	retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000), // Exponential: 1s, 2s, 4s, max 30s
	retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, Rate limit, Server errors
};

export default function useApiQuery<
	TData = unknown,
	TError extends ApiError = ApiError,
>(config: QueryConfig<TData, TError>) {
	const shouldDisableForSSR =
		config.requiresAuth && typeof window === 'undefined';
	const finalEnabled = (config.enabled ?? true) && !shouldDisableForSSR;

	// Merge retry config with defaults
	const retryConfig = {
		...DEFAULT_RETRY_CONFIG,
		...config.retry,
	};

	/**
	 * Determines if an error should be retried
	 */
	const shouldRetry = (attemptNumber: number, error: ApiError): boolean => {
		if (!retryConfig.enabled) return false;
		if (attemptNumber >= retryConfig.maxRetries) return false;

		// Retry on network errors (no status)
		if (!error.status) return true;

		// Retry on specific status codes
		return retryConfig.retryableStatuses.includes(error.status);
	};

	/**
	 * Calculates retry delay
	 */
	const getRetryDelay = (attemptNumber: number): number => {
		if (typeof retryConfig.retryDelay === 'function') {
			return retryConfig.retryDelay(attemptNumber);
		}
		return retryConfig.retryDelay;
	};

	return useQuery<TData, TError>({
		queryKey: [config.url, config.params ?? null],
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
								acc[k] = String(v);
								return acc;
							},
							{} as Record<string, string>
						)
					).toString();
			}

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
				const error: ApiError = {
					message: `HTTP error! status: ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				};

				// Log retry attempts
				console.warn('API request failed', {
					url: config.url,
					status: response.status,
					willRetry: shouldRetry(0, error),
				});

				throw error;
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
		enabled: finalEnabled,

		// React Query retry configuration
		retry: (failureCount, error) => shouldRetry(failureCount, error),
		retryDelay: (attemptIndex) => getRetryDelay(attemptIndex),

		// Merge any additional query options
		...config.queryOptions,
	});
}

// Export helper for custom retry configs
export const createRetryConfig = (
	overrides?: Partial<RetryConfig>
): RetryConfig => ({
	...DEFAULT_RETRY_CONFIG,
	...overrides,
});

// Common retry presets
export const RETRY_PRESETS = {
	// No retries - for critical operations where you want immediate failure
	NONE: {
		enabled: false,
	} as RetryConfig,

	// Quick retries - for real-time operations
	FAST: {
		enabled: true,
		maxRetries: 2,
		retryDelay: (attempt: number) => 200 * attempt, // 200ms, 400ms
		retryableStatuses: [408, 429, 503, 504],
	} as RetryConfig,

	// Standard retries - default behavior
	STANDARD: DEFAULT_RETRY_CONFIG,

	// Aggressive retries - for important background operations
	AGGRESSIVE: {
		enabled: true,
		maxRetries: 5,
		retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 60000), // 500ms, 1s, 2s, 4s, 8s, max 60s
		retryableStatuses: [408, 429, 500, 502, 503, 504],
	} as RetryConfig,

	// Patient retries - for non-urgent operations
	PATIENT: {
		enabled: true,
		maxRetries: 10,
		retryDelay: (attempt: number) => Math.min(2000 * attempt, 120000), // 2s, 4s, 6s... max 120s
		retryableStatuses: [408, 429, 500, 502, 503, 504],
	} as RetryConfig,
};
