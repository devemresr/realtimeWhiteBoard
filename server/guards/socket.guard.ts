import {
	CLIENT_EVENTS,
	ClientEvent,
} from '@shared/constants/socketIo.constant';
import {
	REDIS_KEYS,
	RedisClients,
} from 'controllers/constants/cacheKeys.constant';
import { adminOnlyEvents, isEventAllowed } from './authorization';
import { Socket } from 'socket.io';
import logger from 'utils/logger';
import { canEraseOperation, canManageRoom } from './permissions';
import { RedisFactory } from 'services/redis/RedisFactory';
import { CACHE_KEYS } from 'controllers/constants/cacheKeys.constant';
import { assertRole } from 'utils/redis.assertions';
import { CanvasOperationType, EraseEvent, EventType } from '@/types';
import {
	ForbiddenError,
	IdentityMismatchError,
	MissingPayloadError,
	NotInRoomError,
	RoleChangedError,
	SocketError,
} from './socket.errors';
import { Logger } from 'pino';

type EventHandler<TPayload = unknown> = (
	payload: TPayload,
	callback?: Callback,
) => Promise<void>;
export type Callback = (response: {
	success?: boolean;
	error?: string;
}) => void;

type SocketPayloadCommon = {
	canvasMessageId: string;
	authorId: string;
	roomId: string;
};

export type CanvasPayload = SocketPayloadCommon & { type: CanvasOperationType };
export type RoomPayload = SocketPayloadCommon & { type: EventType };
export type SocketPayloadBase = CanvasPayload | RoomPayload | EraseEvent;

const log = logger.child({ method: 'socketGuard' });
export const socketGuard = <T extends SocketPayloadBase>(
	socket: Socket,
	eventName: ClientEvent,
	handler: EventHandler<T>,
): EventHandler<T> => {
	return async (payload: T, callback?: Callback): Promise<void> => {
		let guardLog: Logger;
		try {
			const redis = RedisFactory.getInstance(RedisClients.MAIN).getRawClient();
			const {
				userId: socketUserId,
				roomId: socketRoomId,
				inRoomRole: socketRole,
			} = socket.data;
			guardLog = log.child({
				method: 'socketGuard',
				eventName,
				socketUserId,
				socketRoomId,
				socketRole,
				payloadCanvasMessageId: payload.canvasMessageId,
				payloadAuthorId: payload.authorId,
				payloadRoomId: payload.roomId,
			});

			guardLog.debug(
				{
					socketData: socket.data,
				},
				'socket guard entered',
			);
			const {
				canvasMessageId: payloadCanvasMessageId,
				authorId: payloadAuthorId,
				roomId: payloadRoomId,
			} = payload;

			// Fetch role directly from Redis don't trust the stale socket.data role
			const cachedRole = await redis.hget(
				CACHE_KEYS.ROOM_ROLES(socketRoomId),
				socketUserId,
			);
			guardLog.debug(
				{
					cachedRole,
				},
				'fetched role from redis',
			);

			// null = user has no entry in this room's role hash => they're not a member (kicked, room deleted, etc.)
			if (!cachedRole) {
				guardLog.warn(
					{
						socketRole,
						cachedRole,
					},
					'role changed since socket connection',
				);
				throw new NotInRoomError(socketUserId, socketRoomId);
			}

			// Role changed since socket connected force reconnect to pick up new role
			if (socket.data.inRoomRole !== cachedRole) {
				throw new RoleChangedError(socketRole, cachedRole);
			}

			// Reject spoofed identity or room client payload must match the authenticated socket session
			if (socketUserId !== payloadAuthorId || socketRoomId !== payloadRoomId) {
				guardLog.warn(
					{
						socketUserId,
						payloadAuthorId,
						socketRoomId,
						payloadRoomId,
					},
					'payload identity mismatch',
				);
				throw new IdentityMismatchError({
					socketUserId,
					payloadAuthorId,
					socketRoomId,
					payloadRoomId,
				});
			}

			if (!isEventAllowed(eventName, assertRole(cachedRole))) {
				guardLog.warn(
					{
						cachedRole,
						eventName,
					},
					'event not allowed for role',
				);
				throw new ForbiddenError({ cachedRole, eventName });
			}
			// For canvas operations, verify the user is the author and in the right room
			guardLog.debug(
				{
					canvasMessageId: payloadCanvasMessageId,
				},
				'checking operation permissions',
			);

			if (
				eventName === CLIENT_EVENTS.CANVAS_OPERATION &&
				!payloadCanvasMessageId
			) {
				guardLog.debug(
					{ canvasMessageId: payloadCanvasMessageId },
					'checking canvas operation permissions',
				);
				throw new MissingPayloadError('canvasMessageId');
			}

			if (payload.type === EventType.ERASE) {
				const erasedStrokeIds = (payload as EraseEvent).erasedStrokeIds;

				const pipeline = redis.pipeline();

				for (const strokeId of erasedStrokeIds) {
					pipeline.hget(REDIS_KEYS.strokeAuthorKey(socketRoomId), strokeId);
				}

				const results = await pipeline.exec();

				erasedStrokeIds.forEach((strokeId, i) => {
					const [err, authorId] = results?.[i] ?? [];

					if (err) {
						throw err;
					}

					if (
						authorId &&
						!canEraseOperation(
							socketUserId,
							socketRoomId,
							socketRole,
							authorId as string,
							payload.roomId,
						)
					) {
						guardLog.warn(
							{
								strokeId,
								authorId,
								socketUserId,
								socketRole,
							},
							'erase permission denied',
						);

						throw new ForbiddenError({
							reason: 'cannot_erase_others_operation',
							canvasMessageId: strokeId,
						});
					}
				});
			}

			// For admin-only events, verify the user is actually admin of this specific room
			if (
				adminOnlyEvents.includes(eventName) &&
				!(await canManageRoom<T>(
					redis,
					eventName,
					payload,
					socketUserId,
					socketRoomId,
				))
			) {
				guardLog.warn(
					{
						eventName,
					},
					'admin permission denied',
				);
				throw new ForbiddenError({ reason: 'not_room_admin', eventName });
			}
		} catch (err) {
			if (err instanceof SocketError) {
				log?.debug(
					{ name: err.name, context: err.context },
					'expected socket error in guard',
				);
				callback?.({ success: false, error: err.message });
			} else {
				log.error({ err }, 'unexpected socket guard error');
				callback?.({ success: false, error: 'INTERNAL_SERVER_ERROR' });
			}
			return;
		}

		try {
			await handler(payload, callback);
			guardLog.debug('handler completed successfully');
		} catch (err) {
			if (err instanceof SocketError) {
				guardLog?.debug(
					{ name: err.name, context: err.context },
					'expected socket error in handler',
				);
				callback?.({ success: false, error: err.message });
			} else {
				guardLog?.error({ err }, 'unexpected error in handler');
				callback?.({ success: false, error: 'INTERNAL_SERVER_ERROR' });
			}
		}
	};
};
