'use client';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiError = {
	message: string;
	status: number;
	statusText: string;
};

type ApiFetchOptions = {
	method?: HttpMethod;
	body?: unknown;
	params?: Record<string, unknown>;
	requiresAuth?: boolean;
	serverUrl?: string;
};

/**
 * Shared API fetch logic used by both query and mutation hooks
 */
export async function apiFetch<TData>(
	url: string,
	options: ApiFetchOptions = {}
): Promise<TData> {
	const accessToken =
		typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

	// Build query string from params
	let queryString = '';
	if (options.params) {
		queryString =
			'?' +
			new URLSearchParams(
				Object.entries(options.params).reduce(
					(acc, [k, v]) => {
						acc[k] = String(v);
						return acc;
					},
					{} as Record<string, string>
				)
			).toString();
	}
	const serverUrl = options.serverUrl ?? process.env.NEXT_PUBLIC_DEV_SERVER_URL;

	if (!serverUrl) {
		throw new Error('serverUrl is not defined');
	}

	const response = await fetch(`${serverUrl}${url}${queryString}`, {
		method: options.method ?? 'GET',
		headers: {
			...(accessToken && { Authorization: `Bearer ${accessToken}` }),
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		...(options.body && { body: JSON.stringify(options.body) }),
	});

	if (!response.ok) {
		const error: ApiError = {
			message: `HTTP error! status: ${response.status}`,
			status: response.status,
			statusText: response.statusText,
		};
		throw error;
	}

	// Handle empty responses (like 204 No Content)
	const contentType = response.headers.get('content-type');
	if (!contentType || !contentType.includes('application/json')) {
		return {} as TData;
	}

	const body = await response.json();

	// Refresh access token if provided
	if (body.accessToken && typeof window !== 'undefined') {
		localStorage.setItem('accessToken', body.accessToken);
	}

	return {
		status: response.status,
		statusText: response.statusText,
		...body,
	} as TData;
}
