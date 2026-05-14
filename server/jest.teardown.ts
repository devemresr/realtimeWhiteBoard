import mongoose from 'mongoose';
import { SocketManager } from './controllers/socket/socketManager';
import { RedisFactory } from './services/redis/RedisFactory';
import { RedisClients } from '../shared/constants/socketIoConstants';

export default async function globalTeardown() {
	const errors: unknown[] = [];

	await SocketManager.getInstance()
		.quitSubClient()
		.catch((err) => errors.push(err));

	await Promise.all([
		RedisFactory.getInstance(RedisClients.MAIN).getRawClient().quit(),
		RedisFactory.getInstance(RedisClients.ADAPTER).getRawClient().quit(),
	]).catch((err) => errors.push(err));

	if (mongoose.connection.readyState === 1) {
		await mongoose.disconnect().catch((err) => errors.push(err));
	}

	if (errors.length > 0) {
		console.error('[globalTeardown] errors:', errors);
	}
}
