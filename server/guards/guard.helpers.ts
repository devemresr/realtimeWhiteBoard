import { REDIS_KEYS } from 'controllers/constants/cacheKeys.constant';
import Redis from 'ioredis';
import { runRedisCommandAndParse } from 'utils/parseRedisFields';

export const getOperation = async (
	redis: Redis,
	strokeId: string,
	roomId: string,
) => {
	return await runRedisCommandAndParse(() =>
		redis.hget(REDIS_KEYS.strokeAuthorKey(roomId), strokeId),
	);
};
