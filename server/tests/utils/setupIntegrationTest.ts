import { RedisClients } from '@shared/constants/socketIoConstants';
import { Server } from 'node:http';
import { createServer } from 'http';
import { gracefulShutdown, startServer } from '../../server';
import { RedisFactory } from 'services/redis/RedisFactory';
import cleanupTestEnvironment from './cleanupTestEnvironment';
import app from '../../app';
const httpServer = createServer(app);

export const setupIntegrationTest = ({
	beforeAllFn,
	afterAllFn,
}: {
	beforeAllFn?: () => Promise<void>;
	afterAllFn?: () => Promise<void>;
} = {}) => {
	let server: Server;

	beforeAll(async () => {
		try {
			server = await startServer(httpServer);
		} catch (error) {
			console.error('error at startServer:', error);
			return;
		}

		await beforeAllFn?.();
	});

	beforeEach(async () => {
		// clean slate before every single test
		const redisMain = RedisFactory.getInstance(RedisClients.MAIN);
		const redisAdapter = RedisFactory.getInstance(RedisClients.ADAPTER);
		await cleanupTestEnvironment([redisMain, redisAdapter]);
	});

	afterAll(async () => {
		await gracefulShutdown(server);
		await afterAllFn?.();
	});
	return {
		getServer: () => server,
	};
};
