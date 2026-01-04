import {
	REDIS_STREAMS,
	SOCKET_EVENTS,
} from '../../shared/constants/socketIoConstants';
import { Socket } from 'socket.io';

import { Server } from 'socket.io';
import RedisStreamManager from '../services/RedisStreamManager';
import Redis from 'ioredis';
import socketRateLimitMiddleware from '../middleware/socketRateLimitMiddleware';
import TokenBucketManager from '../services/TokenBucketManager';

export const REDIS_CONFIG = {
	host: 'localhost',
	port: 6379,
	retryDelayOnFailover: 100,
	maxRetriesPerRequest: 3,
};

class SocketController {
	private io: Server;
	private redisStreamManager: RedisStreamManager;
	private redis: Redis;
	private tokenBucketManager: TokenBucketManager;

	constructor(
		io: Server,
		redis: Redis,
		redisStreamManager: RedisStreamManager,
		tokenBucketManager: TokenBucketManager
	) {
		this.io = io;
		this.redis = redis;
		this.redisStreamManager = redisStreamManager;
		this.tokenBucketManager = tokenBucketManager;
		this.handleConnection = this.handleConnection.bind(this);
		this.handleDrawingPacket = this.handleDrawingPacket.bind(this);
	}

	// Handle individual client connections
	async handleConnection(socket: Socket) {
		try {
			console.log('New client connected:', socket.id);

			this.registerEventHandlers(socket);
			socket.on('disconnect', (reason) => {
				console.log('Client disconnected:', socket.id, 'Reason:', reason);
				this.handleDisconnect(socket);
			});
		} catch (error) {
			console.error('ERROR in handleConnection:', error);
			socket.disconnect(true);
		}
	}

	// Register all socket event handlers for a specific socket
	private registerEventHandlers(socket: Socket) {
		const tokenBucket = this.tokenBucketManager.getOrCreateBucket(socket);

		// todo atp i dont have an actual userid so we're opting out for socketid for dev purposes.
		socket.use(socketRateLimitMiddleware(socket, tokenBucket, () => {}));
		socket.on(SOCKET_EVENTS.DRAWING_PACKET, async (data, callback) => {
			console.log('left tokens: ', await tokenBucket.getRemainingTokens());
			this.handleRedisStreamWriteUp(socket, data, callback);
			this.handleDrawingPacket(socket, data);
		});

		socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomId: string, callback) => {
			socket.join(roomId);

			if (callback) {
				callback({ success: true });
			}
			console.log(`Socket ${socket.id} joined room ${roomId}`);
		});

		socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomId: string) => {
			socket.leave(roomId);
			console.log(`Socket ${socket.id} left room ${roomId}`);
		});
	}

	// Handle writing to Redis stream
	private async handleRedisStreamWriteUp(
		socket: Socket,
		messageData: any,
		callback?: Function
	) {
		try {
			console.log('messageDat a in handleRedisStreamWriteUp ', messageData);

			await this.redisStreamManager.addMessageToStream({
				...messageData,
				originalSocketId: socket.id,
			});

			// Acknowledge the client if callback provided
			if (callback) {
				callback({ success: true });
			}
		} catch (error) {
			console.error(
				'Error in handleRedisStreamWriteUp:',
				(error as Error).message
			);
			if (callback) {
				callback({ success: false, error: (error as Error).message });
			}
		}
	}

	// Handle drawing packet from Redis stream
	private async handleDrawingPacket(socket: Socket, redisMessage: any) {
		let roomId: string | undefined;
		try {
			console.log('redisMessage: ', redisMessage);
			// ({ roomId } = redisMessage);
			roomId = 'test';

			if (!roomId) {
				throw new Error('No roomId found in message');
			}

			// Broadcast to specific room across all servers
			const originalSocketId = socket.id;
			console.log('originalSocketId', originalSocketId);

			// let delay = Math.random() * 1000;
			// const randomlyDelayMore = Math.random() > 0.5;
			// delay = randomlyDelayMore ? Math.random() * 10000 : delay;
			// const delayOrNot = Math.random() > 0.5;
			// setTimeout(
			// 	() => {
			// 		console.log(
			// 			'sending delayed packet',
			// 			delay,
			// 			delayOrNot,
			// 			randomlyDelayMore
			// 		);
			// 		this.io
			// 			.to(roomId)
			// 			.except(originalSocketId)
			// 			.emit(SOCKET_EVENTS.BROADCASTING_DRAWING_DATA, {
			// 				...redisMessage,
			// 			});
			// 	},
			// 	delayOrNot ? delay : 1
			// );
			this.io
				.to(roomId)
				.except(originalSocketId)
				.emit(SOCKET_EVENTS.BROADCASTING_DRAWING_DATA, {
					...redisMessage,
				});
		} catch (error) {
			console.error(
				`Error in broadcasting to the room ${roomId ?? 'unknown'}:`,
				error
			);
		}
	}

	// Handle individual socket disconnect
	private handleDisconnect(socket: Socket) {
		// Clean up any socket-specific resources here
		const usersBucket = this.tokenBucketManager.getOrCreateBucket(socket);
		usersBucket.cleanup();
		console.log(`Cleaning up resources for socket: ${socket.id}`);
	}

	// Clean up method for graceful shutdown
	async cleanup() {
		try {
			// Add cleanup logic for stream manager if needed
			console.log('Cleaning up SocketController resources');
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	}
}

export default SocketController;
