import { REDIS_KEYS } from 'controllers/constants/cacheKeys.constant';
import Redis from 'ioredis';
import { runRedisCommandAndParse } from 'utils/parseRedisFields';
import { assertString } from 'utils/redis.assertions';

export const getOperation = async (
	redis: Redis,
	messageId: string,
	roomId: string,
) => {
	return assertString(
		await runRedisCommandAndParse(() =>
			redis.hget(REDIS_KEYS.msgAuthorKey(roomId), messageId),
		),
		'auhtorId',
	);
};
