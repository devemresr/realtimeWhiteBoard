import {
	CLIENT_EVENTS,
	ClientEvent,
} from '@shared/constants/socketIo.constant';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import { isEventAllowed } from './authorization';
import { Socket } from 'socket.io';
import logger from '@shared/util/logger';
import { canManageRoom, canPerformOperation } from './permissions';
import { getOperation } from './guard.helpers';
import { RedisFactory } from 'services/redis/RedisFactory';
import { CACHE_KEYS, Role } from 'controllers/constants/cacheKeys.constant';
import { assertRole } from 'utils/redis.assertions';
import { CanvasOperationType, EventType } from '@/types';
import {
	ForbiddenError,
	IdentityMismatchError,
	MissingPayloadError,
	NotInRoomError,
	RoleChangedError,
	SocketError,
} from './socket.errors';

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
export type SocketPayloadBase = CanvasPayload | RoomPayload;

const log = logger.child({ method: 'socketGuard' });
export const socketGuard = <T extends SocketPayloadBase>(
	socket: Socket,
	eventName: ClientEvent,
	handler: EventHandler<T>,
): EventHandler<T> => {
	return async (payload: T, callback?: Callback): Promise<void> => {
		let guardLog;
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
			let actualRole = await redis.hget(
				CACHE_KEYS.ROOM_ROLES(socketRoomId),
				socketUserId,
			);
			guardLog.debug(
				{
					actualRole,
				},
				'fetched role from redis',
			);

			// null = user has no entry in this room's role hash => they're not a member (kicked, room deleted, etc.)
			if (!actualRole) {
				guardLog.warn(
					{
						socketRole,
						actualRole,
					},
					'role changed since socket connection',
				);
				throw new NotInRoomError(socketUserId, socketRoomId);
			}

			// Role changed since socket connected force reconnect to pick up new role
			if (socket.data.inRoomRole !== actualRole) {
				throw new RoleChangedError(socketRole, actualRole);
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

			if (!isEventAllowed(eventName, assertRole(actualRole))) {
				guardLog.warn(
					{
						actualRole,
						eventName,
					},
					'event not allowed for role',
				);
				throw new ForbiddenError({ actualRole, eventName });
			}
			// For canvas operations, verify the user is the author and in the right room
			if (eventName === CLIENT_EVENTS.CANVAS_OPERATION)
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
				if (!payloadCanvasMessageId) {
					throw new MissingPayloadError('canvasMessageId');
				}
			}

			// todo after adding any type of editing event change these parts
			const authorId =
				payload.type === EventType.ERASE
					? await getOperation(redis, payloadCanvasMessageId, socketRoomId)
					: null;
			if (
				authorId &&
				!canPerformOperation(socketUserId, socketRoomId, authorId, socketRoomId)
			) {
				guardLog.warn(
					{
						canvasMessageId: payloadCanvasMessageId,
					},
					'operation permission denied',
				);
				throw new ForbiddenError({
					reason: 'cannot_modify_others_operation',
					canvasMessageId: payloadCanvasMessageId,
				});
			}

			// For admin-only events, verify the user is actually admin of this specific room
			if (
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
				guardLog?.debug(
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
