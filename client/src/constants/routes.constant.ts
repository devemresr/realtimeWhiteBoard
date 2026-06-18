export const API_BASE_PATHS = {
	ROOM: '/room',
	AUTH: '/auth',
} as const;

export const ROOM_ROUTES = {
	CREATE: `${API_BASE_PATHS.ROOM}/create`,
	JOIN: `${API_BASE_PATHS.ROOM}/join`,
	LIST_ACTIVE: `${API_BASE_PATHS.ROOM}/active`,
	ONBOARD: '/onboard',
	USERS: `${API_BASE_PATHS.ROOM}/users`,
	GET_MISSING_PACKET: '',
} as const;

export const AUTH_ROUTES = {
	LOGIN: `${API_BASE_PATHS.AUTH}/login`,
	REGISTER: `${API_BASE_PATHS.AUTH}/register`,
	LOGOUT: `${API_BASE_PATHS.AUTH}/logout`,
	REFRESH: `${API_BASE_PATHS.AUTH}/refresh`,
	UPDATE: `${API_BASE_PATHS.AUTH}/update`,
} as const;
