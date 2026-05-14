import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server } from 'socket.io';

export class SocketManager {
	private static instance: SocketManager | null = null;

	private subClient: any;
	private pubClient: any;
	private redis: Redis;
	private io: Server;

	private constructor(io: Server, redis: Redis) {
		this.redis = redis;
		this.io = io;
	}

	static getInstance(io?: Server, redis?: Redis): SocketManager {
		if (!this.instance) {
			if (!io || !redis) {
				throw new Error(
					'SocketManager must be initialized with io and redis on first call',
				);
			}
			this.instance = new SocketManager(io, redis);
		}
		return this.instance;
	}

	/**
	 * The Redis adapter enables Socket.io to work across multiple server instances.
	 * It uses Redis pub/sub internally - when one node broadcasts to a room,
	 * it publishes via Redis so other nodes can relay it to their connected clients.
	 *
	 * Two dedicated clients are required by the adapter (pub + sub).
	 * We duplicate so the sub client can enter subscribe mode without
	 * affecting the pub client, which needs to stay free for regular commands.
	 *
	 * Once set on `io`, the adapter is referenced internally by Socket.io -
	 * the SocketManager instance does not need to be kept alive for this to work.
	 */
	public async initializeRedisAdapter() {
		try {
			// Generic adapter setup
			this.pubClient = this.redis; // Already connected
			// duplicate() inherits connection options but creates a fresh
			// client - needed because sub mode blocks the connection for
			// pub/sub only, so pub and sub must be separate clients.
			this.subClient = this.pubClient.duplicate();
			this.pubClient.on('error', (err: Error) =>
				console.error('Redis adapter pub error:', err),
			);
			this.subClient.on('error', (err: Error) =>
				console.error('Redis adapter sub error:', err),
			);
			// Connect the subClient
			this.subClient.on('ready', () => {
				console.log('subClient is ready');
			});
			// await this.subClient.connect();
			this.io.adapter(createAdapter(this.pubClient, this.subClient));
			this.subClient.on('error', (err: any) =>
				console.error('subClient error:', err),
			);
			console.log('Redis adapter initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Redis adapter:', error);
			throw error;
		}
	}

	public async quitSubClient(): Promise<void> {
		// Only quit subClient this class owns it
		// pubClient belongs to RedisFactory(ADAPTER); gracefulShutdown quits it.
		await this.subClient?.quit();
		this.subClient = null;
		this.pubClient = null; // dereference only, do not quit
		SocketManager.instance = null;
	}
}
