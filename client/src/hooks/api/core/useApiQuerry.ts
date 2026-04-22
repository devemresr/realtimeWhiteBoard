'use client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api-client';

export type RetryConfig = {
	enabled?: boolean;
	maxRetries?: number;
	retryDelay?: number | ((attempt: number) => number);
	retryableStatuses?: number[];
};

export type QueryConfig<TData = unknown, TError extends ApiError = ApiError> = {
	url: string;
	serverUrl?: string;
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
	retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
	retryableStatuses: [408, 429, 500, 502, 503, 504],
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
			return apiFetch<TData>(config.url, config);
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
	overrides?: Partial<RetryConfig>,
): RetryConfig => ({
	...DEFAULT_RETRY_CONFIG,
	...overrides,
});

// Common retry presets
export const RETRY_PRESETS = {
	NONE: {
		enabled: false,
	} as RetryConfig,

	FAST: {
		enabled: true,
		maxRetries: 2,
		retryDelay: (attempt: number) => 200 * attempt,
		retryableStatuses: [408, 429, 503, 504],
	} as RetryConfig,

	STANDARD: DEFAULT_RETRY_CONFIG,

	AGGRESSIVE: {
		enabled: true,
		maxRetries: 5,
		retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 60000),
		retryableStatuses: [408, 429, 500, 502, 503, 504],
	} as RetryConfig,

	PATIENT: {
		enabled: true,
		maxRetries: 10,
		retryDelay: (attempt: number) => Math.min(2000 * attempt, 120000),
		retryableStatuses: [408, 429, 500, 502, 503, 504],
	} as RetryConfig,
};
