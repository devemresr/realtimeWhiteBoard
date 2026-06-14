import mongoose from 'mongoose';
import { AdapterManager } from 'controllers/socket/adapterManager';
import { RedisFactory } from './services/redis/RedisFactory';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';

export default async function globalTeardown() {
	const errors: unknown[] = [];

	await AdapterManager.getInstance()
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
