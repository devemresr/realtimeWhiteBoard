import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import SocketController from './controllers/socketController';
import { instrument } from '@socket.io/admin-ui';
import TokenBucketManager from './services/TokenBucketManager';
import { RedisFactory } from './services/redis/RedisFactory';
import RedisStreamManager from './services/RedisStreamManager';
import { SocketManager } from './controllers/socketManager';
import { RedisClients } from '@shared/constants/socketIoConstants';
import mongoose from 'mongoose';

export async function bootstrapApplication(
	serverReference: HttpServer,
): Promise<any> {
	try {
		// Initialize Socket.IO
		console.log('Initializing Socket.IO');
		const io = new SocketIOServer(serverReference, {
			cors: {
				// origin:
				// 	process.env.NODE_ENV === 'development' ? true : [...allowedOrigins],
				origin: true,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
				allowedHeaders: ['Content-Type'],
				credentials: true,
				// credentials true and origin * is not compatible with some browsers so we use true for allowing origins
			},
			transports: ['websocket', 'polling'],
			allowEIO3: true,
		});
		console.log('Socket.IO initialized');

		// Initialize Redis Adapter
		console.log('Initializing Redis Adapter', process.env.REDIS_ADAPTER_PORT);
		const redisAdapterInstance = await RedisFactory.createClient(
			{
				host: process.env.REDIS_ADAPTER_HOST || 'localhost',
				port: parseInt(process.env.REDIS_ADAPTER_PORT || '6380'),
			},
			RedisClients.ADAPTER,
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
				port: parseInt(process.env.REDIS_PORT || '6379'),
			},

			RedisClients.MAIN,
		);
		redisMain.on('error', (err) => console.error('redisMain', err));

		// await redisAdapterInstance.getClient().flushall();
		// await redisMain.getClient().flushall();
		// clearAllCollections();
		// return;

		async function clearAllCollections() {
			const collections = await mongoose.connection.db
				.listCollections()
				.toArray();
			console.log('collections: ', collections);

			for (const collectionInfo of collections) {
				const collectionName = collectionInfo.name;
				const collection = mongoose.connection.db.collection(collectionName);

				await collection.deleteMany({});
				console.log(`Cleared: ${collectionName}`);
			}
		}

		// Initialize services
		const tokenBucketManager = new TokenBucketManager(redisMain.getClient());
		const redisStreamManager = new RedisStreamManager(redisMain.getClient());

		// Initialize Socket Controller
		const socketController = new SocketController(
			io,
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
