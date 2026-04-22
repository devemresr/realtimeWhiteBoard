import { SocketEvent } from '../../shared/constants/socketIoConstants';
import { Socket } from 'socket.io';

import { Server } from 'socket.io';
import RedisStreamManager from '../services/RedisStreamManager';
import socketRateLimitMiddleware from '../middleware/socketRateLimitMiddleware';
import TokenBucketManager from '../services/TokenBucketManager';
import logger from '../../shared/util/logger';
import pino from 'pino';

export const REDIS_CONFIG = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT || '6380',
	retryDelayOnFailover: 100,
	maxRetriesPerRequest: 3,
};

class SocketController {
	private io: Server;
	private redisStreamManager: RedisStreamManager;
	private tokenBucketManager: TokenBucketManager;
	private log: pino.Logger;

	constructor(
		io: Server,
		redisStreamManager: RedisStreamManager,
		tokenBucketManager: TokenBucketManager,
	) {
		this.io = io;
		this.redisStreamManager = redisStreamManager;
		this.tokenBucketManager = tokenBucketManager;
		this.log = logger.child({ method: 'SocketController' });
		this.handleConnection = this.handleConnection.bind(this);
		this.handleCanvasOperation = this.handleCanvasOperation.bind(this);
	}
	// Handle individual client connections
	async handleConnection(socket: Socket) {
		const socketLog = this.log.child({ socketId: socket.id });
		try {
			socketLog.info('Client connected');

			this.registerEventHandlers(socket);
			socket.on('disconnect', (reason) => {
				socketLog.info({ reason }, 'Client disconnected');
				this.handleDisconnect(socket);
			});
		} catch (error) {
			socketLog.error({ err: error }, 'Error in handleConnection');
			socket.disconnect(true);
		}
	}

	// Register all socket event handlers for a specific socket
	private registerEventHandlers(socket: Socket) {
		const socketLog = this.log.child({ socketId: socket.id });
		const tokenBucket = this.tokenBucketManager.getOrCreateBucket(socket);

		// todo replace socketId with userId once auth is implemented
		socket.use(socketRateLimitMiddleware(socket, tokenBucket, () => {}));
		socket.on(SocketEvent.SEND_PACKET, async (data, callback) => {
			const remainingTokens = await tokenBucket.getRemainingTokens();
			socketLog.debug(
				{ remainingTokens },
				'Packet received, checking rate limit tokens',
			);
			this.handleRedisStreamWriteUp(data, callback);
			this.handleCanvasOperation(socket, data);
		});

		socket.on(SocketEvent.JOIN_ROOM, (roomId: string, callback) => {
			socket.join(roomId);
			socketLog.info({ roomId }, 'Socket joined room');

			if (callback) {
				callback({ success: true });
			}
		});

		socket.on(SocketEvent.LEAVE_ROOM, (roomId: string) => {
			socket.leave(roomId);
			socketLog.info({ roomId }, 'Socket left room');
		});
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

			const redisMessageId = await this.redisStreamManager.addMessageToStream({
				...messageData,
			});

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
	private async handleCanvasOperation(socket: Socket, redisMessage: any) {
		const socketLog = this.log.child({ method: 'handleCanvasOperation' });
		let roomId: string | undefined;
		try {
			socketLog.debug({ redisMessage }, 'Processing drawing packet');
			({ roomId } = redisMessage);
			if (!roomId) {
				throw new Error('No roomId found in message');
			}

			const originalSocketId = socket.id;
			socketLog.info({ roomId }, 'Broadcasting drawing packet to room');

			this.io
				.to(roomId)
				.except(originalSocketId)
				.emit(SocketEvent.BROADCAST_PACKET, {
					...redisMessage,
				});
		} catch (error) {
			socketLog.error(
				{ err: error, roomId: roomId ?? 'unknown' },
				'Error broadcasting drawing packet to room',
			);
		}
	}

	// Handle individual socket disconnect
	private handleDisconnect(socket: Socket) {
		const socketLog = this.log.child({ socketId: socket.id });
		const usersBucket = this.tokenBucketManager.getOrCreateBucket(socket);
		usersBucket.cleanup();
		socketLog.info('Cleaned up resources for socket');
	}

	// Clean up method for graceful shutdown
	async cleanup() {
		try {
			this.log.info('Cleaning up SocketController resources');
		} catch (error) {
			this.log.error({ err: error }, 'Error during SocketController cleanup');
		}
	}
}

export default SocketController;
