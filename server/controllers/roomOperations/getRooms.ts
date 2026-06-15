import { Request, Response } from 'express';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import { RedisFactory } from 'services/redis/RedisFactory';
import {
	CACHE_KEYS,
	ROOM_ARCHIVAL_THRESHOLD_MS,
} from 'controllers/constants/cacheKeys.constant';
import { parseRedisFields, RedisParseMode } from 'utils/parseRedisFields';
import logger from '@shared/util/logger';

const log = logger.child({ method: 'getRooms' });

export const getRooms = async (req: Request, res: Response): Promise<void> => {
	try {
		const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();

		const activeRoomResult = await redis.zrevrangebyscore(
			CACHE_KEYS.ACTIVE_ROOMS,
			'+inf',
			Date.now() - ROOM_ARCHIVAL_THRESHOLD_MS,
			'WITHSCORES',
		);

		const liveRooms: { roomId: string; score: number }[] = [];
		for (let i = 0; i + 1 < activeRoomResult.length; i += 2) {
			liveRooms.push({
				roomId: activeRoomResult[i] as string,
				score: Number(activeRoomResult[i + 1]),
			});
		}

		log.debug({ liveRoomCount: liveRooms.length }, 'active rooms fetched');

		if (liveRooms.length === 0) {
			res.status(200).json({ rooms: [] });
			return;
		}

		// member count + room meta for each room
		const pipeline = redis.pipeline();
		for (const { roomId } of liveRooms) {
			pipeline.hlen(CACHE_KEYS.ROOM_ROLES(roomId));
			pipeline.hgetall(CACHE_KEYS.ROOM_DATA(roomId));
			pipeline.hlen(CACHE_KEYS.ROOM_CONNECTED_USERS(roomId));
		}

		const pipelineResults = await pipeline.exec();
		if (!pipelineResults) throw new Error('Redis pipeline returned null');

		// Build result, one entry per room
		const rooms = liveRooms.map(({ roomId, score }, i) => {
			const baseIndex = i * 3;

			const [roleCountErr, rawRoleCount] = pipelineResults[baseIndex] as [
				Error | null,
				number | null,
			];

			const [metaErr, rawMeta] = pipelineResults[baseIndex + 1] as [
				Error | null,
				Record<string, string> | null,
			];

			const [activeUserCountErr, rawActiveUserCount] = pipelineResults[
				baseIndex + 2
			] as [Error | null, number | null];

			if (metaErr)
				log.warn({ roomId, err: metaErr }, 'hgetall failed for room');
			if (activeUserCountErr)
				log.warn(
					{ roomId, err: activeUserCountErr },
					'hlen failed for connected users',
				);

			const memberCount = rawRoleCount ?? 0;
			const activeUserCount = rawActiveUserCount ?? 0;
			const meta = rawMeta
				? parseRedisFields(rawMeta, RedisParseMode.HASH)
				: null;

			if (!meta) {
				log.warn({ roomId }, 'room meta missing from Redis for live room');
			}

			return {
				roomId,
				name: meta?.name,
				description: meta?.description,
				createdBy: meta?.createdBy,
				isLocked: meta?.isLocked ?? false,
				roomStatus: meta?.roomStatus,

				memberCount,
				activeUserCount,
				isLive: activeUserCount > 0,

				lastActiveAt: new Date(score).toISOString(),
			};
		});

		log.debug({ roomCount: rooms.length }, 'getRooms successful');
		res.status(200).json({ rooms });
	} catch (error) {
		log.error({ err: error }, 'Unexpected error at getRooms controller');
		res.status(500).json({
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
