import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server } from 'socket.io';

export class SocketManager {
	private subClient: any;
	private pubClient: any;
	private redis: Redis;
	private io: Server;

	constructor(io: Server, redis: Redis) {
		this.redis = redis;
		this.io = io;
	}

	public async initializeRedisAdapter() {
		try {
			// Generic adapter setup
			this.pubClient = this.redis; // Already connected
			this.subClient = this.pubClient.duplicate();

			console.log('redis adapter init wip');

			this.pubClient.on('error', (err: Error) =>
				console.error('Redis adapter pub error:', err)
			);
			this.subClient.on('error', (err: Error) =>
				console.error('Redis adapter sub error:', err)
			);
			// Connect the subClient
			await this.subClient.connect();
			this.io.adapter(createAdapter(this.pubClient, this.subClient));
			console.log('Redis adapter initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Redis adapter:', error);
			throw error;
		}
	}
}
