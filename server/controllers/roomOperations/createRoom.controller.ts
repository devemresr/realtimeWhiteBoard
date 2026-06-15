import { Request, Response } from 'express';
import logger from '@shared/util/logger';
import { requireUserId } from 'controllers/auth/auth.helpers';
import { RedisFactory } from 'services/redis/RedisFactory';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import {
	CACHE_KEYS,
	CACHE_KEYS_TTL,
	Role,
} from 'controllers/constants/cacheKeys.constant';
import RoomMetadata from 'models/RoomMetadata';
import Room, { TimestampedRoom } from 'models/Room';
const { nanoid } = require('nanoid');

let log = logger.child({ method: 'createRoom.controller' });

export const createRoom = async (req: Request, res: Response) => {
	try {
		const userId = requireUserId(req);
		log.info({ userId }, 'Create room request received');
		log.child({ userId });

		const {
			name = 'Untitled Room',
			description = '',
			maxMembers = null,
			isLocked = false,
			code = null,
			passwordHash = null,
		} = req.body as {
			name?: string;
			description?: string;
			maxMembers?: number | null;
			isLocked?: boolean;
			code?: string | null;
			passwordHash?: string | null;
		};

		const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();

		// enforce room limit check cache first, fall back to DB
		let activeRoomCount: number;

		const cached = await redis.get(CACHE_KEYS.USER_ACTIVE_ROOM_COUNT(userId));

		log.debug(
			{
				cacheKey: CACHE_KEYS.USER_ACTIVE_ROOM_COUNT(userId),
				cachedValue: cached,
			},
			'Fetched active room count cache',
		);

		if (cached !== null) {
			activeRoomCount = parseInt(cached);

			log.info(
				{
					userId,
					activeRoomCount,
				},
				'Using cached active room count',
			);
		} else {
			log.info({ userId }, 'Room count cache miss querying database');

			activeRoomCount = await RoomMetadata.countDocuments({
				createdBy: userId,
				roomStatus: { $eq: 'ACTIVE' },
			});

			log.info(
				{
					userId,
					activeRoomCount,
				},
				'Computed active room count from database',
			);

			await redis.set(
				CACHE_KEYS.USER_ACTIVE_ROOM_COUNT(userId),
				activeRoomCount,
				'EX',
				CACHE_KEYS_TTL.USER_ROOM_COUNT,
			);

			log.debug(
				{
					activeRoomCount,
					ttl: CACHE_KEYS_TTL.USER_ROOM_COUNT,
				},
				'Cached active room count',
			);
		}

		const userOwnedActiveRoomCount = await redis.incr(
			CACHE_KEYS.USER_ACTIVE_ROOM_COUNT(userId),
		);

		log.debug(
			{
				userOwnedActiveRoomCount,
			},
			'Fetched parsed redis room count',
		);

		// generate short human-readable room code
		const roomId = nanoid(6);
		log.child({ roomId });

		// write to DB first source of truth
		const room = await Room.create({
			roomId,
			createdBy: userId,
			name,
			description,
			maxMembers,
			isLocked,
			code,
			passwordHash,
			roomStatus: isLocked ? 'LOCKED' : 'ACTIVE',
		}).then((doc) => {
			const { __v, createdAt, updatedAt, banned, ...room } =
				doc.toObject() as TimestampedRoom & {
					__v: number;
					_id: unknown;
				};
			return room;
		});
		log.info(
			{
				room,
			},
			'Created room metadata document',
		);

		const createRoomPipeline = redis.pipeline();

		createRoomPipeline.hset(CACHE_KEYS.ROOM_ROLES(roomId), userId, Role.ADMIN);

		createRoomPipeline.hset(CACHE_KEYS.ROOM_DATA(roomId), room);

		createRoomPipeline.expire(
			CACHE_KEYS.ROOM_DATA(roomId),
			CACHE_KEYS_TTL.ROOM_ACTIVE,
		);

		createRoomPipeline.expire(
			CACHE_KEYS.ROOM_ROLES(roomId),
			CACHE_KEYS_TTL.ROOM_ACTIVE,
		);

		createRoomPipeline.zadd(CACHE_KEYS.ACTIVE_ROOMS, Date.now(), roomId);

		const createRoomResults = await createRoomPipeline.exec();

		if (!createRoomResults) throw new Error('Redis pipeline returned null');

		for (const [err] of createRoomResults) {
			if (err) throw err;
		}

		return res.status(201).json({
			roomId,
			success: true,
			room,
		});
	} catch (error) {
		log.error({ err: error }, 'Unexpected error at createRoom controller');
		return res.status(500).json({
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
