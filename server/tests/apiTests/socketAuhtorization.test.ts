import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { setupIntegrationTest } from 'tests/utils/setupIntegrationTest';
import {
	createTestUser,
	registerAndGetTokens,
} from 'tests/utils/authTestHelpers';
import { CLIENT_EVENTS } from '@shared/constants/socketIo.constant';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import { CACHE_KEYS } from 'controllers/constants/cacheKeys.constant';
import { Role } from '@/types';
import { parseAccessToken } from 'utils/token.helpers';
import {
	AuthHeaders,
	createRoomAndGetId,
	joinRoom,
} from 'tests/utils/roomTestHelpers';
import { RedisFactory } from 'services/redis/RedisFactory';
import { adminOnlyEvents } from 'guards/authorization';

export const SOCKET_CONFIG = {
	transports: ['websocket'] as string[],
	reconnection: false,
	reconnectionDelayMax: 5000,
} as const;

const disconnectAll = (...sockets: ClientSocket[]) =>
	sockets.forEach((s) => s.connected && s.disconnect());
const { getServer } = setupIntegrationTest();

const getSocketUrl = () => {
	const address = getServer().address();

	if (!address || typeof address === 'string') {
		throw new Error('Server is not listening on a TCP port');
	}

	return `http://localhost:${address.port}`;
};

const connectSocket = (token: string): Promise<ClientSocket> => {
	return new Promise((resolve, reject) => {
		console.log('getSocketUrl', getSocketUrl());

		const socket = ioc(getSocketUrl(), {
			...SOCKET_CONFIG,
			auth: { token },
		});

		socket.connect();
		socket.on('connect', () => resolve(socket));
		socket.on('connect_error', reject);
	});
};

const emit = <T>(
	socket: ClientSocket,
	event: string,
	payload: unknown,
	timeoutMs = 10000,
): Promise<T> =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`emit timeout: ${event}`)),
			timeoutMs,
		);
		socket.emit(event, payload, (res: T) => {
			clearTimeout(timer);
			resolve(res);
		});
	});

describe('socketGuard full event flow', () => {
	let participantSocket: ClientSocket;
	let adminSocket: ClientSocket;
	let participantToken: string;
	let adminToken: string;
	let participantId: string;
	let adminId: string;
	let roomId: string;
	let participantAuth: AuthHeaders;
	let adminAuth: AuthHeaders;
	let _res: any;

	beforeEach(async () => {
		({ res: _res, ...participantAuth } = await registerAndGetTokens(
			getServer(),
			createTestUser({ name: 'participant' }),
		));
		({ res: _res, ...adminAuth } = await registerAndGetTokens(
			getServer(),
			createTestUser({ name: 'admin' }),
		));

		participantToken = participantAuth.accessToken;
		participantId = parseAccessToken(participantToken).userId;
		adminToken = adminAuth.accessToken;
		adminId = parseAccessToken(adminToken).userId;

		roomId = await createRoomAndGetId(getServer(), adminAuth);
		await joinRoom(getServer(), participantAuth, roomId, 'participant');
		await joinRoom(getServer(), adminAuth, roomId);

		participantSocket = await connectSocket(participantToken);
		adminSocket = await connectSocket(adminToken);

		// Both join the same room
		await emit(participantSocket, CLIENT_EVENTS.JOIN_ROOM, {
			roomId,
		});
		await emit(adminSocket, CLIENT_EVENTS.JOIN_ROOM, {
			roomId,
		});
	});

	afterEach(() => {
		disconnectAll(participantSocket, adminSocket);
	});

	it('allows participant to emit a canvas operation', async () => {
		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{ canvasMessageId: 'msg-1', authorId: participantId, roomId },
		);
		expect(res.success).toBe(true);
	});

	it('allows admin to emit all admin-only events', async () => {
		console.log(adminOnlyEvents.map((event, i) => `${i}: ${event}`));
		const results = await Promise.all(
			adminOnlyEvents.map((event, index) =>
				emit<{ success: boolean }>(adminSocket, event, {
					canvasMessageId: 'msg-' + index,
					authorId: adminId,
					roomId,
				}),
			),
		);
		expect(results.every((res) => res.success === true)).toBe(true);
	});

	it('rejects participant emitting all admin-only events', async () => {
		const results = await Promise.all(
			adminOnlyEvents.map((event) =>
				emit<{ success: boolean }>(participantSocket, event, {
					canvasMessageId: 'msg-1',
					authorId: participantId,
					roomId,
				}),
			),
		);
		expect(results.every((res) => res.success === false)).toBe(true);
	});

	it('rejects user emitting without having joined a room', async () => {
		const noRoomSocket = await connectSocket(participantToken);
		// never emits JOIN_ROOM so socketRoomId is undefined, no role in Redis

		const res = await emit<{ success: boolean }>(
			noRoomSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{ canvasMessageId: 'msg-1', authorId: participantId, roomId },
		);

		noRoomSocket.disconnect();
		expect(res.success).toBe(false);
	});
	it('rejects spoofed authorId', async () => {
		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{ canvasMessageId: 'msg-1', authorId: 'not-me', roomId },
		);
		expect(res.success).toBe(false);
	});

	it('rejects spoofed roomId', async () => {
		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{
				canvasMessageId: 'msg-1',
				authorId: participantId,
				roomId: 'different-room',
			},
		);
		expect(res.success).toBe(false);
	});

	it('rejects spoofed authorId', async () => {
		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{
				canvasMessageId: 'msg-1',
				authorId: 'fakeId',
				roomId,
			},
		);
		expect(res.success).toBe(false);
	});

	it('rejects admin emitting an admin only event for a room they are not admin of', async () => {
		// admin joins other room as participant only
		const newRoomId = await createRoomAndGetId(getServer(), participantAuth);
		await joinRoom(getServer(), adminAuth, newRoomId, 'participant');
		const adminNewRoomSocket = await connectSocket(adminAuth.accessToken);

		await emit(adminNewRoomSocket, CLIENT_EVENTS.JOIN_ROOM, {
			roomId: newRoomId,
		});

		const res = await emit<{ success: boolean }>(
			adminNewRoomSocket,
			CLIENT_EVENTS.LOCK_ROOM,
			{ canvasMessageId: 'msg-1', authorId: adminId, roomId: newRoomId },
		);

		adminNewRoomSocket.disconnect();
		expect(res.success).toBe(false);
	});

	it('rejects when role changes mid-session without reconnect', async () => {
		// Participant gets promoted to admin in Redis directly (simulating getServer()-side role change)
		// but their socket.data.inRoomRole is still PARTICIPANT  guard should reject
		const redisClient = RedisFactory.getInstance(
			RedisClients.MAIN,
		).getRawClient();

		await redisClient.hset(
			CACHE_KEYS.ROOM_ROLES(roomId),
			participantId,
			Role.ADMIN,
		);

		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.LOCK_ROOM,
			{ canvasMessageId: 'msg-1', authorId: participantId, roomId },
		);
		expect(res.success).toBe(false);
	});

	it('rejects canvas operation where the stored operation belongs to a different user', async () => {
		// msg-999 was authored by someone else in Redis
		await emit<{ success: boolean }>(
			adminSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{ canvasMessageId: 'msg-999', authorId: adminId, roomId },
		);
		const res = await emit<{ success: boolean }>(
			participantSocket,
			CLIENT_EVENTS.CANVAS_OPERATION,
			{ canvasMessageId: 'msg-999', authorId: participantId, roomId },
		);
		expect(res.success).toBe(false);
	});
});
