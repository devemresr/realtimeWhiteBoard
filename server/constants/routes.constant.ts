export const API_BASE_PATHS = {
	AUTH: '/auth',
	ROOM: '/room',
} as const;

export const ROOM_ROUTES = {
	CREATE: '/create',
	JOIN: '/join',
	LIST_ACTIVE: '/active',
	ONBOARD: '/onboard',
	GET_MISSING_PACKET: '',
} as const;

export const AUTH_ROUTES = {
	LOGIN: '/login',
	REGISTER: '/register',
	TEST: '/test',
} as const;

export const ROOM_API = {
	CREATE: `${API_BASE_PATHS.ROOM}${ROOM_ROUTES.CREATE}`,
	JOIN: `${API_BASE_PATHS.ROOM}${ROOM_ROUTES.JOIN}`,
	LIST_ACTIVE: `${API_BASE_PATHS.ROOM}${ROOM_ROUTES.LIST_ACTIVE}`,
	ONBOARD: `${API_BASE_PATHS.ROOM}${ROOM_ROUTES.ONBOARD}`,
	GET_MISSING_PACKET: `${API_BASE_PATHS.ROOM}`,
} as const;

export const AUTH_API = {
	REGISTER: `${API_BASE_PATHS.AUTH}${AUTH_ROUTES.REGISTER}`,
	LOGIN: `${API_BASE_PATHS.AUTH}${AUTH_ROUTES.LOGIN}`,
	TEST: `${API_BASE_PATHS.AUTH}${AUTH_ROUTES.TEST}`,
};
