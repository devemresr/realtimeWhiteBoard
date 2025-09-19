import {
	REDIS_STREAMS,
	SOCKET_EVENTS,
} from '../../shared/constants/socketIoConstants';
import { Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server } from 'socket.io';
import RedisStreamManager from '../services/RedisStreamManager';
import Redis from 'ioredis';
import TokenBucket from '../services/TokenBucket';
import socketRateLimitMiddleware from '../middleware/socketRateLimitMiddleware';

export const REDIS_CONFIG = {
	host: 'localhost',
	port: 6379,
	retryDelayOnFailover: 100,
	maxRetriesPerRequest: 3,
};

class SocketController {
	private io: Server;
	private writeStreamManager: RedisStreamManager; // For writing
	private subClient: any;
	private pubClient: any;
	private redis: Redis;
	private initialized: boolean = false;
	private tokenBuckets = new Map<string, TokenBucket>();

	constructor(io: Server) {
		this.io = io;
		this.redis = new Redis(REDIS_CONFIG);
		this.writeStreamManager = new RedisStreamManager();
		this.handleConnection = this.handleConnection.bind(this);
		this.handleDrawingPacket = this.handleDrawingPacket.bind(this);
		this.setupRedisEventHandlers = this.setupRedisEventHandlers.bind(this);
	}
	async initialize() {
		if (this.initialized) return;
		try {
			await this.initializeRedisAdapter();
			await this.initializeStreams();
			this.initialized = true;
			console.log('SocketController initialized successfully');
		} catch (error) {
			console.error('Failed to initialize SocketController:', error);
			// await this.cleanup()
			throw error;
		}
	}

	private getTokenBucket(socket: Socket): TokenBucket {
		const userId = 'test';

		if (!this.tokenBuckets.has(userId)) {
			const bucket = new TokenBucket(
				this.redis,
				userId,
				10000, // tokenCap
				2000, // refillRate (tokens per second)
				1000 // cost per request
			);
			this.tokenBuckets.set(userId, bucket);
			console.log(`Created token bucket for user ${userId}`);
		}

		return this.tokenBuckets.get(userId)!;
	}

	private async initializeRedisAdapter() {
		try {
			// Create Redis clients for the adapter
			this.pubClient = createClient({
				socket: {
					host: 'localhost',
					port: 6379,
					// Connection resilience options
					reconnectStrategy: (retries) => {
						if (retries > 10) {
							console.error('Redis reconnection failed after 10 attempts');
							return new Error('Too many retries');
						}
						const delay = Math.min(retries * 50, 500);
						console.log(
							`Redis reconnecting in ${delay}ms (attempt ${retries})`
						);
						return delay; // Exponential backoff, max 500ms
					},
					connectTimeout: 5000,
				},
			});

			// generic adapter setup
			this.subClient = this.pubClient.duplicate();
			console.log('redis adapter init wip');

			// Setup error handlers before connecting
			await this.setupRedisEventHandlers();
			console.log('setupRedisEventHandlers ran successfully');

			// Connect both clients in case one fails alls fails
			await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
			this.io.adapter(createAdapter(this.pubClient, this.subClient));

			console.log('Redis adapter initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Redis adapter:', error);
			throw error;
		}
	}

	private async setupRedisEventHandlers() {
		const clients = [this.pubClient, this.subClient];
		clients.forEach((client) => {
			client.on('error', (err: Error) => {
				console.error('Redis pub client error:', err);
			});

			// Reconnection handling
			client.on('connect', () => {
				console.log('Redis pub client connected');
			});

			client.on('disconnect', () => {
				console.log('Redis sub client disconnected');
			});

			client.on('reconnecting', () => {
				console.log('Redis sub client reconnecting...');
			});
		});
	}

	// Initialize Redis streams once for the entire server
	private async initializeStreams() {
		try {
			await this.writeStreamManager.initialize(REDIS_STREAMS.DRAWING_EVENTS);
			console.log('streams inited');
		} catch (error) {
			console.error('Failed to initialize streams:', error);
		}
	}

	// Handle individual client connections
	async handleConnection(socket: Socket) {
		if (!this.initialized) {
			console.log('handleConnection failed because of initialize');
			return;
		}
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
		const tokenBucket = this.getTokenBucket(socket);

		// todo atp i dont have an actual userid so were opting out for socketid for dev purposes.
		socket.use(socketRateLimitMiddleware(socket, tokenBucket, () => {}));
		socket.on(SOCKET_EVENTS.DRAWING_PACKET, async (data, callback) => {
			console.log('data hHE', data);

			// save the recent roomdata into the redis
			const { roomId } = data;
			await this.redis.sadd(roomId, data);

			console.log('left tokens: ', await tokenBucket.getRemainingTokens());
			this.handleRedisStreamWriteUp(socket, data, callback);
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
			await this.writeStreamManager.addMessageToStream({
				socketId: socket.id,
				messageData,
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
	private async handleDrawingPacket(
		redisMessage: any,
		messageId: string,
		streamName: string
	) {
		if (!this.initialized) return;
		try {
			const roomId = redisMessage?.data?.data?.messageData?.roomId;
			if (!roomId) {
				throw new Error('No roomId found in message');
			}

			// Broadcast to specific room across all servers
			const originalSocketId = redisMessage.data.data.socketId;

			this.io
				.to(roomId)
				.except(originalSocketId)
				.emit(SOCKET_EVENTS.RECEIVED_DATA, {
					messageId,
					streamName,
					data: redisMessage.data.data,
				});
		} catch (error) {
			console.error('Error in handleDrawingPacket:', error);
		}
	}

	// Handle individual socket disconnect
	private handleDisconnect(socket: Socket) {
		// Clean up any socket-specific resources here
		const usersBucket = this.getTokenBucket(socket);
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
