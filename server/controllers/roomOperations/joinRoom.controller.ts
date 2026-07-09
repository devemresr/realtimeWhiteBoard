import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import logger from 'utils/logger';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import { JoinRoomRequest, Role } from '@/types';
import { RedisFactory } from 'services/redis/RedisFactory';
import {
	CACHE_KEYS,
	CACHE_KEYS_TTL,
} from 'controllers/constants/cacheKeys.constant';
import { requireUserId } from 'controllers/auth/auth.helpers';
import { parseRedisFields } from 'utils/parseRedisFields';
import Room from 'models/Room';
import { assertRole } from 'utils/redis.assertions';

const log = logger.child({ method: 'joinRoom.controller' });

export const joinRoom = async (req: Request, res: Response) => {
	try {
		const userId = requireUserId(req);
		const {
			roomId,
			role: reqRole = Role.SPECTATOR,
			password,
		} = (req.body ?? {}) as JoinRoomRequest;

		log.info({ roomId, requestedRole: reqRole }, 'joinRoom request received');

		if (!roomId) {
			log.warn('joinRoom rejected: missing roomId');
			res.status(400).json({ error: 'roomId is required' });
			return;
		}

		const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();

		const readResults = await redis
			.pipeline()
			.sismember(CACHE_KEYS.ROOM_BANNED_USERS(roomId), userId)
			.hgetall(CACHE_KEYS.ROOM_DATA(roomId))
			.hget(CACHE_KEYS.ROOM_ROLES(roomId), userId)
			.exec();

		if (!readResults) throw new Error('Redis pipeline returned null');

		// Throw on any pipeline command error
		for (const [err] of readResults) {
			if (err) throw err;
		}

		const [
			[bannedErr, isBanned], // sismember => number (0 or 1)
			[roomMetaErr, rawRoomMeta], // hgetall => Record<string, string> | null
			[roomRoleErr, roomRole], // hget => string | null
		] = readResults as [
			[Error | null, number],
			[Error | null, Record<string, string> | null],
			[Error | null, string | null],
		];

		// Now parse the ones that need it
		const roomMeta = rawRoomMeta ? parseRedisFields(rawRoomMeta) : null;

		if (isBanned) {
			log.warn('joinRoom rejected: user is banned from room');
			res.status(403).json({ error: 'You are banned from this room' });
			return;
		}
		if (!reqRole && !roomRole) {
			log.warn('joinRoom rejected: a role is required');
			res.status(400).json({ error: 'joinRoom rejected: a role is required' });
			return;
		}
		logger.debug({ reqRole, roomRole });
		const role = assertRole(roomRole ?? reqRole);

		let roomStatus: string | undefined;

		if (!roomMeta) {
			log.info('room meta cache miss, falling back to DB');

			const roomResult = await Room.findOne({ roomId }).lean();

			if (!roomResult) {
				res.status(404).json({ error: 'Room not found' });
				return;
			}

			const { banned, roomId: _roomId, ...room } = roomResult;
			roomStatus = room.roomStatus;

			// hydrate room data and ban set
			const hydrationPipeline = redis.pipeline();

			hydrationPipeline.hset(CACHE_KEYS.ROOM_DATA(roomId), room);
			hydrationPipeline.expire(
				CACHE_KEYS.ROOM_DATA(roomId),
				CACHE_KEYS_TTL.ROOM_ACTIVE,
			);

			if (banned.length > 0) {
				hydrationPipeline.sadd(CACHE_KEYS.ROOM_BANNED_USERS(roomId), ...banned);
				hydrationPipeline.expire(
					CACHE_KEYS.ROOM_BANNED_USERS(roomId),
					CACHE_KEYS_TTL.ROOM_ACTIVE,
				);
			}

			await hydrationPipeline.exec();

			log.info({ bannedCount: banned.length }, 'room meta hydrated into cache');
		} else {
			roomStatus = roomMeta.roomStatus as string | undefined;
			log.info('room meta cache hit');
		}

		// register member presence and mark room active
		const results = await redis
			.pipeline()
			.hset(CACHE_KEYS.ROOM_ROLES(roomId), userId, role)
			.zadd(CACHE_KEYS.ACTIVE_ROOMS, Date.now(), roomId)
			.hgetall(CACHE_KEYS.ROOM_ROLES(roomId))
			.hgetall(CACHE_KEYS.ROOM_CONNECTED_USERS(roomId))
			.exec();

		if (!results) throw new Error('Redis pipeline returned null');

		for (const [err] of results) {
			if (err) throw err;
		}

		const [, , [, roomRoles], [, connectedUsers]] = results as [
			[Error | null, number],
			[Error | null, number],
			[Error | null, Record<string, string> | null],
			[Error | null, Record<string, string> | null],
		];

		const memberRoles = roomRoles ?? {};
		const connectedUserIds = Object.keys(connectedUsers ?? {});
		const memberCount = connectedUserIds.length;

		const maxMembers = Number(roomMeta?.maxMembers ?? 0);

		if (maxMembers > 0 && memberCount >= maxMembers && !roomRole) {
			res.status(403).json({ error: 'Room is full' });
			return;
		}

		logger.debug({ roomMeta }, 'joinRoom');
		if (roomMeta?.password) {
			if (!password) {
				res.status(403).json({ error: 'Room requires a password' });
				return;
			}

			const isMatch = await bcrypt.compare(
				password,
				roomMeta.password as string,
			);

			if (!isMatch) {
				res.status(403).json({ error: 'Invalid room password' });
				return;
			}
		}

		// fetch profile data for everyone currently connected to the room
		let users: Array<
			{ userId: string; role?: string } & Record<string, unknown>
		> = [];

		if (connectedUserIds.length > 0) {
			const profilePipeline = redis.pipeline();
			connectedUserIds.forEach((id) => {
				profilePipeline.hgetall(CACHE_KEYS.USER_PROFILE(id));
			});

			const profileResults = await profilePipeline.exec();
			if (!profileResults) throw new Error('Redis pipeline returned null');

			users = connectedUserIds.map((id, idx) => {
				const [profileErr, rawProfile] = profileResults[idx] as [
					Error | null,
					Record<string, string> | null,
				];
				if (profileErr) throw profileErr;

				const profile = rawProfile ? parseRedisFields(rawProfile) : {};

				return {
					userId: id,
					role: memberRoles[id],
					...profile,
				};
			});
		}

		log.info('joinRoom successful, handing off to socket handler');
		return res.status(201).json({
			roomId,
			role,
			status: roomStatus,
			success: true,
			memberCount,
			users,
		});
	} catch (error) {
		log.error({ err: error }, 'Unexpected error at joinRoom controller');
		return res.status(500).json({
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
