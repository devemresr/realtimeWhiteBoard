import { registerAndGetTokens } from 'tests/utils/authTestHelpers';
import { setupIntegrationTest } from 'tests/utils/setupIntegrationTest';
import {
	createRoom,
	joinRoom,
	getActiveRooms,
	createRooms,
	createRoomAndGetId,
} from 'tests/utils/roomTestHelpers';

const { getServer } = setupIntegrationTest();

describe('POST /canvas/rooms/create', () => {
	it('registers a new user and creates a room', async () => {
		const server = getServer();
		const { res: _res, ...auth } = await registerAndGetTokens(server);

		const res = await createRoom(server, auth);

		expect(auth.jwtCookie).toMatch(/HttpOnly/i);
		expect(res.status).toBe(201);
	});

	it('registers a new user, creates a room and joins that room', async () => {
		const server = getServer();
		const { res: _res, ...auth } = await registerAndGetTokens(server);

		const roomId = await createRoomAndGetId(server, auth);
		const res = await joinRoom(server, auth, roomId, 'spectator');

		expect(res.status).toBe(201);
	});

	it('registers a new user, creates rooms, joins one and gets active rooms', async () => {
		const server = getServer();
		const { res: _res, ...auth } = await registerAndGetTokens(server);

		const createResults = await createRooms(server, auth, 5);
		const roomId = createResults.at(-1)?.body.roomId;

		expect(roomId).toBeDefined();

		await joinRoom(server, auth, roomId, 'spectator');

		const res = await getActiveRooms(server, auth);

		expect(res.status).toBe(200);
		expect(res.body.rooms).toBeDefined();
	});
});
