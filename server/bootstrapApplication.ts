import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import SocketController from 'controllers/socket/socket.controller';
import { instrument } from '@socket.io/admin-ui';
import TokenBucketManager from './services/rate-limit/TokenBucketManager';
import { RedisFactory } from './services/redis/RedisFactory';
import RedisStreamManager from 'services/streams/RedisStreamManager';
import { AdapterManager } from 'controllers/socket/adapterManager';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import allowedOrigins from 'config/allowedOrigins';
import TokenBlacklist from 'services/redis/TokenBlacklist';

export async function bootstrapApplication(
	serverReference: HttpServer,
): Promise<any> {
	try {
		console.log('process.env.NODE_ENV', process.env.NODE_ENV);

		// Initialize Socket.IO
		console.log('Initializing Socket.IO');
		const io = new SocketIOServer(serverReference, {
			// This CORS config applies to the Socket.IO handshake endpoint (/socket.io/*).
			// Express CORS middleware does NOT run for this endpoint,
			// so we must configure CORS separately for Socket.IO.
			cors: {
				origin: (origin, callback) => {
					if (!origin || process.env.NODE_ENV === 'development') {
						return callback(null, true);
					}

					if (allowedOrigins.includes(origin)) {
						return callback(null, true);
					}

					return callback(new Error(`Not allowed by CORS: ${origin}`));
				},
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
				allowedHeaders: ['Content-Type'],
				credentials: true,
			},
			// transports:
			// 	process.env.NODE_ENV === 'loadTest'
			// 		? ['websocket']
			// 		: ['polling', 'websocket'],
			transports: ['polling', 'websocket'],
			// upgradeTimeout: 100, // upgrade to websocket almost immediately
			allowEIO3: true,
		});
		console.log('Socket.IO initialized');

		// initialize redis adapter
		// Two separate Redis instances are used intentionally:
		// 	 mainRedis: app-level data (streams, cache, etc.) used directly by the app
		//   adapterRedis: isolated instance dedicated solely to Socket.io pub/sub
		//   for syncing socket events across server nodes (horizontal scaling)
		//   App code should never use adapterRedis directly.
		console.log(
			'Initializing Redis Adapter port:',
			process.env.REDIS_ADAPTER_PORT,
		);
		const redisAdapterInstance = await RedisFactory.createClient(
			{
				host: process.env.REDIS_ADAPTER_HOST || '127.0.0.1',
				port: parseInt(process.env.REDIS_ADAPTER_PORT || '6380'),
			},
			RedisClients.ADAPTER,
		);

		const socketManager = AdapterManager.getInstance(
			io,
			redisAdapterInstance.getRawClient(),
		);
		await socketManager.initializeRedisAdapter();

		// Initialize main Redis client (for streams + cache)
		const redisMain = await RedisFactory.createClient(
			{
				host: process.env.REDIS_HOST || '127.0.0.1',
				port: parseInt(process.env.REDIS_PORT || '6379'),
			},
			RedisClients.MAIN,
		);

		// await redisAdapterInstance.getRawClient().flushall();
		// await redisMain.getRawClient().flushall();
		// clearAllCollections();
		// return;

		// async function clearAllCollections() {
		// 	const collections = await mongoose.connection.db
		// 		.listCollections()
		// 		.toArray();
		// 	console.log('collections: ', collections);

		// 	for (const collectionInfo of collections) {
		// 		const collectionName = collectionInfo.name;
		// 		const collection = mongoose.connection.db.collection(collectionName);

		// 		await collection.deleteMany({});
		// 		console.log(`Cleared: ${collectionName}`);
		// 	}
		// }

		// Initialize services
		const tokenBucketManager = new TokenBucketManager(redisMain.getRawClient());
		const redisStreamManager = new RedisStreamManager(redisMain.getRawClient());
		const tokenBlacklist = new TokenBlacklist(redisMain.getRawClient());

		// Initialize Socket Controller
		const socketController = new SocketController(
			io,
			redisStreamManager,
			tokenBucketManager,
			tokenBlacklist,
			redisMain.getRawClient(),
		);

		socketController.handleConnection();

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
			tokenBlacklist,
			redisMain,
			redisAdapterInstance,
		};
	} catch (error) {
		console.log('error at startup:', error);
		throw error;
	}
}
