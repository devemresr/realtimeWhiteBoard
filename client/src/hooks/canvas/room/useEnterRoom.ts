import {
	useGetOnboardingData,
	useJoinRoom,
} from 'src/hooks/api/endpoints/useFormPosts';
import { useRoomStatusStore } from 'src/store/RoomStore';
import { useSocketStore } from 'src/store/socketStore';
import { CLIENT_EVENTS } from '@shared/constants/socketIo.constant';
import { toast } from 'react-toastify';
import { useModalStore } from 'src/store/ModalStore';
import { useRoomUsersStore } from 'src/store/user/RoomUserStore';
import { useOnboardingSync } from 'src/hooks/networking/synchronization/useOnboardingSync';

export function useEnterRoom() {
	const joinRoom = useJoinRoom();
	const setRoom = useRoomStatusStore((state) => state.setRoom);
	const socket = useSocketStore((state) => state.socket);
	const { closeModal } = useModalStore();
	const setUsers = useRoomUsersStore((s) => s.setUsers);

	const enterRoom = async (roomId: string, password?: string | null) => {
		if (!socket) {
			toast.error('Socket not connected');
			throw new Error('Socket not connected');
		}

		const joinData = await joinRoom.mutateAsync(
			{ roomId, password },
			{
				onSuccess: (data) => {
					setUsers(data.users);
				},
			},
		);

		await new Promise<void>((resolve, reject) => {
			socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId }, (ack) => {
				if (!ack?.success) {
					const message = ack?.message ?? 'Socket join failed';
					toast.error(message);
					reject(new Error(message));
					return;
				}
				resolve();
			});
		});
		toast.success(`Joined room ${roomId}`);

		// todo delete or decide what to do
		const { roomId: roomIdd, role, status } = joinData;
		setRoom({ roomId });
		setRoom({ role });
		setRoom({ status });
		localStorage.setItem('roomIdd', roomIdd);

		closeModal();

		return joinData;
	};

	return {
		enterRoom,
		isPending: joinRoom.isPending,
	};
}
