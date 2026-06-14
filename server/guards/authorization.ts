import {
	CLIENT_EVENTS,
	ClientEvent,
} from '@shared/constants/socketIo.constant';
import { Role } from 'controllers/constants/cacheKeys.constant';

const EVENT_ROLE_REQUIREMENTS: Record<ClientEvent, Role[]> = {
	[CLIENT_EVENTS.JOIN_ROOM]: Object.values(Role),
	[CLIENT_EVENTS.LEAVE_ROOM]: Object.values(Role),
	[CLIENT_EVENTS.CANVAS_OPERATION]: [Role.ADMIN, Role.PARTICIPANT],
	[CLIENT_EVENTS.KICK_USER]: [Role.ADMIN],
	[CLIENT_EVENTS.LOCK_ROOM]: [Role.ADMIN],
	[CLIENT_EVENTS.LOCK_CANVAS_PAGE]: [Role.ADMIN],
	[CLIENT_EVENTS.LOCK_USER]: [Role.ADMIN],
};

export const adminOnlyEvents = Object.entries(EVENT_ROLE_REQUIREMENTS)
	.filter(([_, roles]) => roles.length === 1 && roles[0] === Role.ADMIN)
	.map(([eventName, _]) => eventName);

export const isEventAllowed = (eventName: ClientEvent, role: Role): boolean => {
	return EVENT_ROLE_REQUIREMENTS[eventName]?.includes(role) ?? false;
};
