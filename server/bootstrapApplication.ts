import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http'; // or 'https'
import allowedOrigins from './config/allowedOrigins';
import SocketController from './controllers/socketController';
import { instrument } from '@socket.io/admin-ui';
import TokenBucketManager from './services/TokenBucketManager';
import { RedisFactory } from './services/redis/RedisFactory';
import { RedisClient } from './services/redis/RedisClient';
import RedisStreamManager from './services/RedisStreamManager';
import { SocketManager } from './controllers/socketManager';
import { REDIS_CLIENTS } from '../shared/constants/socketIoConstants';

export async function bootstrapApplication(
	serverReference: HttpServer,
	port: string,
): Promise<any> {
	try {
		// Initialize Socket.IO
		console.log('Initializing Socket.IO');
		const io = new SocketIOServer(serverReference, {
			cors: {
				origin: [...allowedOrigins],
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
				allowedHeaders: ['Content-Type'],
				credentials: true,
			},
			transports: ['websocket', 'polling'],
			allowEIO3: true,
		});
		console.log('Socket.IO initialized');

		// Initialize Redis Adapter
		console.log('Initializing Redis Adapter');
		const redisAdapterInstance = await RedisFactory.createClient(
			{
				port: 6380,
			},
			REDIS_CLIENTS.ADAPTER,
		);
		redisAdapterInstance.on('error', (err) => console.error('adapter', err));
		console.log('Redis Adapter initialized');

		// initialize redis adapter
		const socketManager = new SocketManager(
			io,
			redisAdapterInstance.getClient(),
		);
		await socketManager.initializeRedisAdapter();

		// Initialize main Redis client (for streams + cache)
		const redisMain = await RedisFactory.createClient(
			{
				port: 6379,
			},
			REDIS_CLIENTS.MAIN,
		);
		redisMain.on('error', (err) => console.error('redisMain', err));

		// await redisAdapterInstance.getClient().flushall();
		// await redisMain.getClient().flushall();

		// Initialize services
		const tokenBucketManager = new TokenBucketManager(redisMain.getClient());
		const redisStreamManager = new RedisStreamManager(redisMain.getClient());

		// Initialize Socket Controller
		const socketController = new SocketController(
			io,
			redisMain.getClient(),
			redisStreamManager,
			tokenBucketManager,
		);

		io.on(
			'connection',
			socketController.handleConnection.bind(socketController),
		);

		// Setup admin UI
		// todo add auth
		instrument(io, {
			auth: false,
			mode: 'development',
		});

		return {
			instrument,
			io,
			socketController,
			redisStreamManager,
			tokenBucketManager,
			redisMain,
			redisAdapterInstance,
		};
	} catch (error) {
		console.log('error at startup:', error);
		throw error;
	}
}
