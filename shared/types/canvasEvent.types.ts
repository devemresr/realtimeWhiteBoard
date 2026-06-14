import { MessageCategory, MessageStatus } from './message.types';

export enum EventType {
	ERASE = 'erase',
	USER_JOIN = 'user_join',
	USER_LEAVE = 'user_leave',
	KICK_USER = 'kick_user',
	LOCK_ROOM = 'lock_room',
	LOCK_CANVAS_PAGE = 'lock_canvas_page',
	LOCK_USER = 'lock_user',
}

interface BaseCanvasEvent {
	roomId: string;
	authorId: string;
	canvasMessageId: string;
	category: MessageCategory.EVENT;
	timestamp?: number;
	status?: MessageStatus;
}

export type EraseEvent = BaseCanvasEvent & {
	type: EventType.ERASE;
	erasedStrokeIds: string[];
};

export type UserJoinEvent = BaseCanvasEvent & {
	type: EventType.USER_JOIN;
};

export type UserLeaveEvent = BaseCanvasEvent & {
	type: EventType.USER_LEAVE;
};

export type KickUserEvent = BaseCanvasEvent & {
	type: EventType.KICK_USER;
	targetUserId: string;
};

export type LockRoomEvent = BaseCanvasEvent & {
	type: EventType.LOCK_ROOM;
	locked: boolean;
};

export type LockCanvasPageEvent = BaseCanvasEvent & {
	type: EventType.LOCK_CANVAS_PAGE;
	pageId: string;
	locked: boolean;
};

export type LockUserEvent = BaseCanvasEvent & {
	type: EventType.LOCK_USER;
	targetUserId: string;
	locked: boolean;
};

export type RoomEvent =
	| EraseEvent
	| UserJoinEvent
	| UserLeaveEvent
	| KickUserEvent
	| LockRoomEvent
	| LockCanvasPageEvent
	| LockUserEvent;
export type CanvasEvent = EraseEvent | UserJoinEvent | UserLeaveEvent;
