'use client';

import { lazy, use, useEffect } from 'react';
import { useRefresh } from 'src/hooks/api/endpoints/useFormPosts';
import { useUserStore } from 'src/store/UserStore';
import { useSocket } from 'src/hooks/canvas/room/useSocket';
import logger from 'src/util/logger';
import { useEnterRoom } from 'src/hooks/canvas/room/useEnterRoom';
import { toast } from 'react-toastify';

const Canvas = lazy(() => import('../components/canvas'));

const WhiteBoardApp = () => {
	const refresh = useRefresh();
	const setUser = useUserStore((state) => state.setUser);
	const socket = useSocket(); // handles connection + toasts
	const { enterRoom } = useEnterRoom();
	const user = useUserStore((state) => state.userId);

	useEffect(() => {
		refresh.mutateAsync(
			{},
			{
				onSuccess: async (data) => {
					logger.debug({ data }, 'refresh');
					const {
						name,
						surname,
						username,
						avatarUrl,
						email,
						_id: userId,
					} = data.user;
					localStorage.setItem('accessToken', data.accessToken);
					setUser({ userId, surname, name, username, email, avatarUrl });
				},
				onError: (error) => {
					logger.error({ error }, 'refresh error');
					localStorage.removeItem('roomIdd');
				},
			},
		);
	}, []);

	useEffect(() => {
		const autoJoinRoom = async () => {
			const roomId = localStorage.getItem('roomIdd');

			logger.debug({ roomId, userId: user }, 'enteringRoom');

			if (!roomId) return;
			if (!socket) return;
			if (!user) return;

			try {
				await enterRoom(roomId);
			} catch (err: any) {
				toast.error(err.message ?? 'Failed to join room');
			}
		};

		autoJoinRoom();
	}, [socket, user]);
	return <>{<Canvas socket={socket} />}</>;
};

export default WhiteBoardApp;
