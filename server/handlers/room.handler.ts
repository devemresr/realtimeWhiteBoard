import { Socket } from 'socket.io';
import { Callback } from '../guards/socket.guard';

export const handleRoomLeave =
	(socket: Socket) =>
	async (payload: { roomId: string }, callback: Callback) => {
		try {
			socket.leave(payload.roomId);
			// socketLog.info({ roomId }, 'Socket left room');
			return callback({ success: true });
		} catch (error) {
			return callback({ success: false, error: 'err' });
		}
	};
