import mongoose from 'mongoose';
import { RedisClient } from 'services/redis/RedisClient';

const cleanupTestEnvironment = async (redisInstances: RedisClient[]) => {
	await Promise.allSettled(
		redisInstances.map((redis) => redis.getRawClient().flushall()),
	).then((results) =>
		results
			.filter((r) => r.status === 'rejected')
			.forEach((r) =>
				console.error(
					'Redis flush error:',
					(r as PromiseRejectedResult).reason,
				),
			),
	);

	if (mongoose.connection.readyState === 1) {
		await mongoose.connection
			.dropDatabase()
			.catch((err) => console.error('Drop database error:', err));
	}
};

export default cleanupTestEnvironment;
