import {
	CLIENT_EVENTS,
	SERVER_EVENTS,
	STREAMED_EVENTS,
} from '@shared/constants/socketIo.constant';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import RedisStreamManager from 'services/streams/RedisStreamManager';
import TokenBucketManager from 'services/rate-limit/TokenBucketManager';
import logger from '@shared/util/logger';
import pino, { Logger } from 'pino';
import { verifyAccessToken } from 'services/auth/verifyAccessToken.service';
import TokenBlacklist from 'services/redis/TokenBlacklist';
import { runRedisCommandAndParse } from 'utils/parseRedisFields';
import Redis from 'ioredis';
import { CACHE_KEYS } from 'controllers/constants/cacheKeys.constant';
import { Callback, socketGuard } from 'guards/socket.guard';
import { CanvasMessage } from '@/types';
import TokenBucket from 'services/rate-limit/TokenBucket';

class SocketController {
	private io: Server;
	private redisStreamManager: RedisStreamManager;
	private tokenBucketManager: TokenBucketManager;
	private log: pino.Logger;
	private tokenBlacklist: TokenBlacklist;
	private redis: Redis;

	constructor(
		io: Server,
		redisStreamManager: RedisStreamManager,
		tokenBucketManager: TokenBucketManager,
		tokenBlacklist: TokenBlacklist,
		redis: Redis,
	) {
		this.io = io;
		this.redis = redis;
		this.redisStreamManager = redisStreamManager;
		this.tokenBucketManager = tokenBucketManager;
		this.tokenBlacklist = tokenBlacklist;
		this.log = logger.child({ method: 'SocketController' });
		this.handleConnection = this.handleConnection.bind(this);
		this.handleCanvasOperation = this.handleCanvasOperation.bind(this);
	}
	// Handle individual client connections
	async handleConnection() {
		// at handshake authenticate the user and hyderate socket object
		this.io.use(this.authenticateHandshake.bind(this));

		this.io.on('connection', (socket) => {
			// Already authenticated via handshake
			if (socket.data.userId) {
				this.setupSocket(socket, socket.data.userId);
				return;
			}

			// Allow unauthenticated connection but authenticate via event
			const isLoadTest = process.env.NODE_ENV === 'loadTest';
			if (isLoadTest) {
				socket.on('authenticate', (data, callback) =>
					this.handleLoadTestAuthenticate(socket, data, callback),
				);
			}
		});
	}

	// Socket.IO middleware: validates the access token at handshake time
	// and hydrates socket.data with userId/jti/profile info
	private async authenticateHandshake(
		socket: Socket,
		next: (err?: Error) => void,
	) {
		const isLoadTest = process.env.NODE_ENV === 'loadTest';
		if (isLoadTest) return next();
		try {
			const accessToken =
				socket.handshake?.auth?.token || socket.handshake?.query?.token;
			this.log.debug(
				{
					socketId: socket.id,
					accessToken,
				},
				'handshake fired:',
			);
			if (!accessToken) {
				return next(new Error('UNAUTHORIZED'));
			}
			const result = await verifyAccessToken(accessToken, this.tokenBlacklist);

			switch (result.status) {
				case 'invalid':
					return next(new Error('UNAUTHORIZED'));
				case 'refresh':
					return next(new Error('TOKEN_EXPIRED'));
				case 'valid':
					await this.hydrateSocketData(socket, result.userId, result.jti);
					return next();
			}
		} catch (err) {
			this.log.error({ err, socketId: socket.id }, 'unhandled handshake error');
			next(err as Error);
		}
	}

	// Populates socket.data with userId, jti, room info, and cached profile fields
	private async hydrateSocketData(socket: Socket, userId: string, jti: string) {
		// guaranteed from handshake middleware
		socket.data.userId = userId;
		socket.data.jti = jti;
		// socket.io admin-ui package causes issues when the values are assigned to data object are null instead we use undefined
		socket.data.roomId = undefined;
		socket.data.inRoomRole = undefined;

		const profile = await runRedisCommandAndParse(() =>
			this.redis.hgetall(CACHE_KEYS.USER_PROFILE(userId)),
		);
		// from profile cache warm from login
		socket.data.name = profile?.name;
		socket.data.surname = profile?.surname;
	}

	// Handles late authentication for load-test connections that skipped handshake auth
	private async handleLoadTestAuthenticate(
		socket: Socket,
		data: any,
		callback?: Callback,
	) {
		const result = await verifyAccessToken(data.token, this.tokenBlacklist);
		console.log('authentication result: ', result);
		if (result.status === 'valid') {
			await this.hydrateSocketData(socket, result.userId, result.jti);
			callback?.({ success: true });
			this.setupSocket(socket, result.userId); // run full setup after auth
		} else {
			socket.disconnect();
		}
	}

	// Wires up all event listeners (canvas streaming, room join/leave) for an authenticated socket
	private setupSocket(socket: Socket, userId: string) {
		const socketLog = this.log.child({ socketId: socket.id, userId });
		const tokenBucket = this.tokenBucketManager.getOrCreateBucket(userId);
		socketLog.debug('connection event');

		// socket.use(socketRateLimitMiddleware(socket, tokenBucket, () => {}));
		this.registerStreamedEvents(socket, tokenBucket, socketLog);
		this.registerRoomEvents(socket, userId, socketLog);
	}

	// Registers handlers for all STREAMED_EVENTS (canvas operations) with rate-limit token checks
	private registerStreamedEvents(
		socket: Socket,
		tokenBucket: TokenBucket,
		socketLog: Logger,
	) {
		STREAMED_EVENTS.forEach((event) => {
			socket.on(
				event,
				socketGuard<CanvasMessage>(socket, event, async (data, callback) => {
					const remainingTokens = await tokenBucket.getRemainingTokens();
					socketLog.debug(
						{ remainingTokens },
						'Packet received, checking rate limit tokens',
					);
					this.handleRedisStreamWriteUp(data, callback);
					this.handleCanvasOperation(socket, data, socketLog);
				}),
			);
		});
	}

	// Registers JOIN_ROOM and LEAVE_ROOM handlers for an authenticated socket
	private registerRoomEvents(
		socket: Socket,
		userId: string,
		socketLog: Logger,
	) {
		socket.on(CLIENT_EVENTS.JOIN_ROOM, (data, callback?: Callback) =>
			this.handleJoinRoom(socket, userId, data, callback, socketLog),
		);

		socket.on(CLIENT_EVENTS.LEAVE_ROOM, (reason) => {
			socketLog.info({ reason }, 'Client disconnected');
			this.handleDisconnect(userId, socket);
		});
	}

	// Handles a JOIN_ROOM request: validates roomId/role, registers the user as connected, and updates socket state
	private async handleJoinRoom(
		socket: Socket,
		userId: string,
		data: any,
		callback: Callback | undefined,
		socketLog: Logger,
	) {
		const roomId = data?.roomId;
		console.log('data in joinRoom: ', data);

		if (!roomId) {
			return callback?.({
				success: false,
				error: 'No roomId provided',
			});
		}
		const role = await this.redis.hget(CACHE_KEYS.ROOM_ROLES(roomId), userId);
		if (!role) {
			return new Error('Unexpected error please retry again.');
		}
		await this.redis.hset(
			CACHE_KEYS.ROOM_CONNECTED_USERS(roomId),
			userId,
			socket.id,
		);
		socket.data.inRoomRole = role;
		socket.data.roomId = roomId;

		socketLog
			.child({ roomId, userId })
			.debug('JOIN_ROOM event completed successfully');
		callback?.({ success: true });
	}
	// Handle writing to Redis stream
	private async handleRedisStreamWriteUp(
		messageData: any,
		callback?: Function,
	) {
		const socketLog = this.log.child({
			method: 'handleRedisStreamWriteUp',
			roomId: messageData.roomId,
			canvasMessageId: messageData.canvasMessageId,
		});
		try {
			socketLog.debug('Writing message to Redis stream');

			const redisMessageId =
				await this.redisStreamManager.addMessageToStream(messageData);

			socketLog.debug(
				{ redisMessageId },
				'Message successfully written to Redis stream',
			);

			if (callback) {
				callback({ success: true });
			}
		} catch (error) {
			socketLog.error({ err: error }, 'Error writing to Redis stream');
			if (callback) {
				callback({ success: false, error: (error as Error).message });
			}
		}
	}

	// Handle drawing packet from Redis stream
	private async handleCanvasOperation(
		socket: Socket,
		redisMessage: any,
		socketLog: pino.Logger,
	) {
		const log = socketLog.child({ method: 'handleCanvasOperation' });
		let roomId: string | undefined;
		try {
			log.debug({ redisMessage }, 'Processing drawing packet');
			({ roomId } = redisMessage);
			if (!roomId) {
				throw new Error('No roomId found in message');
			}

			const originalSocketId = socket.id;
			log.info({ roomId }, 'Broadcasting drawing packet to room');

			this.io
				.to(roomId)
				.except(originalSocketId)
				.emit(SERVER_EVENTS.BROADCAST_OPERATION, {
					...redisMessage,
				});
		} catch (error) {
			log.error(
				{ err: error, roomId: roomId ?? 'unknown' },
				'Error broadcasting drawing packet to room',
			);
		}
	}

	// Handle individual socket disconnect
	private async handleDisconnect(userId: string, socket: Socket) {
		const socketLog = this.log.child({ userId });
		const usersBucket = this.tokenBucketManager.getOrCreateBucket(userId);
		usersBucket.cleanup();
		const roomId = socket.data?.roomId;
		await this.redis.hdel(
			CACHE_KEYS.ROOM_CONNECTED_USERS(roomId),
			userId,
			socket?.id,
		);
		socketLog.info('Cleaned up resources for socket');
	}
}

export default SocketController;
