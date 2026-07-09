import pkg from 'bcryptjs';
const { hashSync } = pkg;

import { Request, Response } from 'express';
import logger from 'utils/logger';
import { requireUserId } from 'controllers/auth/auth.helpers';
import { RedisFactory } from 'services/redis/RedisFactory';
import {
	CACHE_KEYS,
	CACHE_KEYS_TTL,
	RedisClients,
} from 'controllers/constants/cacheKeys.constant';
import Room from 'models/Room';
import { Role, RoomStatus } from '@/types';
import { SALT_ROUNDS } from 'controllers/auth/register.controller';

const log = logger.child({ method: 'changeRoomSettings.controller' });

type ChangeRoomSettingsBody = {
	roomId?: string;
	name?: string;
	description?: string;
	maxMembers?: number | null;
	password?: string | null;
	roomStatus?: RoomStatus;
};

const ALLOWED_ROOM_STATUSES = new Set<string>(Object.values(RoomStatus));

export const changeRoomSettings = async (req: Request, res: Response) => {
	try {
		const userId = requireUserId(req);

		const { roomId, name, description, maxMembers, password, roomStatus } =
			(req.body ?? {}) as ChangeRoomSettingsBody;

		if (!roomId) {
			return res.status(400).json({ error: 'roomId is required' });
		}

		if (roomStatus && !ALLOWED_ROOM_STATUSES.has(roomStatus)) {
			return res.status(400).json({
				error: 'Invalid roomStatus',
				allowedValues: Object.values(RoomStatus),
			});
		}

		if (
			maxMembers !== undefined &&
			maxMembers !== null &&
			(Number.isNaN(Number(maxMembers)) || Number(maxMembers) < 1)
		) {
			return res.status(400).json({
				error: 'maxMembers must be a positive number or null',
			});
		}

		const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();

		const currentRole = await redis.hget(CACHE_KEYS.ROOM_ROLES(roomId), userId);

		if (currentRole !== Role.ADMIN) {
			return res.status(403).json({
				error: 'Only room admin can change room settings',
			});
		}

		const updateFields: Record<string, unknown> = {};

		if (name !== undefined) {
			updateFields.name = name.trim() || 'Untitled Room';
		}

		if (description !== undefined) {
			updateFields.description = description.trim();
		}

		if (maxMembers !== undefined) {
			updateFields.maxMembers = maxMembers;
		}

		if (roomStatus !== undefined) {
			updateFields.roomStatus = roomStatus;
			updateFields.isLocked = roomStatus === RoomStatus.LOCKED;
		}

		if (password !== undefined && password !== null && password.trim() !== '') {
			updateFields.password = hashSync(password, SALT_ROUNDS);
		}

		if (Object.keys(updateFields).length === 0) {
			return res.status(400).json({
				error: 'No valid room settings were provided',
			});
		}

		const room = await Room.findOneAndUpdate(
			{
				roomId,
				createdBy: userId,
			},
			{
				$set: updateFields,
			},
			{
				new: true,
				lean: true,
			},
		);

		if (!room) {
			return res.status(404).json({ error: 'Room not found' });
		}

		const { __v, banned, ...cacheRoom } = room as any;

		const pipeline = redis.pipeline();

		pipeline.hset(CACHE_KEYS.ROOM_DATA(roomId), cacheRoom);
		pipeline.expire(CACHE_KEYS.ROOM_DATA(roomId), CACHE_KEYS_TTL.ROOM_ACTIVE);

		pipeline.expire(CACHE_KEYS.ROOM_ROLES(roomId), CACHE_KEYS_TTL.ROOM_ACTIVE);

		if (room.roomStatus === RoomStatus.PRIVATE) {
			pipeline.zrem(CACHE_KEYS.ACTIVE_ROOMS, roomId);
		} else {
			pipeline.zadd(CACHE_KEYS.ACTIVE_ROOMS, Date.now(), roomId);
		}

		const results = await pipeline.exec();

		if (!results) throw new Error('Redis pipeline returned null');

		for (const [err] of results) {
			if (err) throw err;
		}

		log.info(
			{
				roomId,
				userId,
				updatedFields: Object.keys(updateFields),
			},
			'Room settings changed successfully',
		);

		return res.status(200).json({
			success: true,
			roomId,
			roomStatus: room.roomStatus,
			room: cacheRoom,
		});
	} catch (error) {
		log.error(
			{ err: error },
			'Unexpected error at changeRoomSettings controller',
		);

		return res.status(500).json({
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
