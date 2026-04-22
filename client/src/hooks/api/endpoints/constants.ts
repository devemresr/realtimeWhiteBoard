export const AUTH_ROUTES = {
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
} as const;

export const CANVAS_ROUTES = {
	GET_MISSING_PACKET: '',
	ONBOARD: '/onboard',
	ROOMS: {
		JOIN_ROOM: '/canvas/rooms/join',
		CREATE_ROOM: '/canvas/rooms/create',
	},
};
