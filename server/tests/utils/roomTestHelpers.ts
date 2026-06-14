import request from 'supertest';
import { ROOM_API } from 'constants/routes.constant';
import { Server } from 'node:http';

export type AuthHeaders = {
	accessToken: string;
	jwtCookie: string;
};

export const withAuth = (req: request.Test, auth: AuthHeaders) => {
	return req
		.set('Authorization', `Bearer ${auth.accessToken}`)
		.set('Cookie', auth.jwtCookie);
};

export const createRoom = async (server: Server, auth: AuthHeaders) => {
	return withAuth(request(server).post(ROOM_API.CREATE), auth);
};

export const joinRoom = async (
	server: Server,
	auth: AuthHeaders,
	roomId: string,
	role: 'admin' | 'spectator' | 'participant' = 'spectator',
) => {
	return withAuth(request(server).post(ROOM_API.JOIN), auth).send({
		roomId,
		role,
	});
};

export const getActiveRooms = async (server: Server, auth: AuthHeaders) => {
	return withAuth(request(server).get(ROOM_API.LIST_ACTIVE), auth);
};

export const createRooms = async (
	server: Server,
	auth: AuthHeaders,
	count: number,
) => {
	const results = [];

	for (let i = 0; i < count; i++) {
		results.push(await createRoom(server, auth));
	}

	return results;
};

export const createRoomAndGetId = async (server: Server, auth: AuthHeaders) => {
	const res = await createRoom(server, auth);
	return res.body.roomId as string;
};
