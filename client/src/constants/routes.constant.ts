export const API_BASE_PATHS = {
	ROOM: '/room',
	AUTH: '/auth',
} as const;

export const ROOM_ROUTES = {
	CREATE: `${API_BASE_PATHS.ROOM}/create`,
	JOIN: `${API_BASE_PATHS.ROOM}/join`,
	LIST_ACTIVE: `${API_BASE_PATHS.ROOM}/active`,
	ONBOARD: `${API_BASE_PATHS.ROOM}/onboard`,
	GET_MISSING_PACKET: '',
} as const;

export const AUTH_ROUTES = {
	LOGIN: `${API_BASE_PATHS.AUTH}/login`,
	REGISTER: `${API_BASE_PATHS.AUTH}/register`,
	TEST: `${API_BASE_PATHS.AUTH}/test`,
} as const;
