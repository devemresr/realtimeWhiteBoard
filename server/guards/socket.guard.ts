import { SocketEvent } from '@shared/constants/socketIoConstants';
import { isEventAllowed } from './authorization';
import { Socket } from 'socket.io';
type EventHandler<TPayload = unknown> = (
	payload: TPayload,
	callback: Callback,
) => Promise<void>;
export type Callback = (response: {
	success?: boolean;
	error?: string;
}) => void;

export const socketGuard = (
	socket: Socket,
	eventName: SocketEvent,
	handler: EventHandler<any>,
): EventHandler => {
	return async (payload: unknown, callback: Callback): Promise<void> => {
		const allowed = await isEventAllowed(socket?.user?.id, eventName, payload);
		if (!allowed) {
			callback({ error: 'FORBIDDEN' });
			return;
		}
		try {
			handler(payload, callback);
		} catch (err) {
			callback({ error: err.message });
		}
	};
};
