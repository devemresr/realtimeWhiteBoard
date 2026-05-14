import { SocketEvent } from '@shared/constants/socketIoConstants';

export const isEventAllowed = async (
	userId: string,
	eventName: SocketEvent,
	payload: unknown,
): Promise<boolean> => {
	switch (eventName) {
		case SocketEvent.JOIN_ROOM:
			return false;
		case SocketEvent.LEAVE_ROOM:
			return true;
		default:
			return false;
	}
};
