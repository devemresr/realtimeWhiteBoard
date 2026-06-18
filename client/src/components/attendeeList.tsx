import { useCallback, useEffect, useState } from 'react';
import { FaCrown } from 'react-icons/fa';
import { TbLogout } from 'react-icons/tb';

import { PiUsersThree } from 'react-icons/pi';

import { useUserStore } from 'src/store/UserStore';
import { useSocketStore } from 'src/store/socketStore';
import { useRoomUsersStore } from 'src/store/user/RoomUserStore';
import logger from 'src/util/loggerTest';
import { CLIENT_EVENTS } from '@shared/constants/socketIo.constant';
import { toast } from 'react-toastify';

export default function AttendeeList() {
	const [active, setActive] = useState(false);
	const [online, setOnline] = useState(false);

	const userId = useUserStore((state) => state.userId);
	const socket = useSocketStore((state) => state.socket);

	const users = useRoomUsersStore((s) => s.users);
	const removeUser = useRoomUsersStore((s) => s.removeUser);

	useEffect(() => {
		const roomId = localStorage.getItem('roomIdd');

		if (userId && socket && roomId) {
			setOnline(true);
		} else {
			setOnline(false);
		}
	}, [userId, socket]);
	useEffect(() => {
		logger.debug({ users });
	}, [userId, socket]);
	const kickUser = useCallback(
		async (targetUserId: string) => {
			await new Promise<void>((resolve, reject) => {
				const roomId = localStorage.getItem('roomIdd');

				socket?.emit(
					CLIENT_EVENTS.KICK_USER,
					{ targetUserId, roomId, authorId: userId, userId },
					(ack) => {
						if (!ack?.success) {
							const message = ack?.message ?? 'Kick user failed';
							toast.error(message);
							reject(new Error(message));
							return;
						}

						removeUser(targetUserId);
						resolve();
					},
				);
			});
		},
		[socket, userId, removeUser],
	);

	if (!online) return null;

	return (
		<>
			<button
				onClick={() => setActive((prev) => !prev)}
				className='w-8 h-8 bg-gray-100 shadow p-1.5 items-center justify-center rounded transition-colors hover:bg-purple-100 fixed right-2 top-2'
			>
				<PiUsersThree size={20} />
			</button>

			{active && (
				<div
					style={{
						width: 260,
						maxHeight: 600,
						minHeight: 200,
						zIndex: 1,
					}}
					className='overflow-y-auto fixed right-2 top-12 bg-white border rounded-lg border-gray-200 p-2 shadow flex flex-col gap-1'
				>
					{users.length === 0 && (
						<p className='text-sm text-gray-500 text-center py-4'>
							No users connected
						</p>
					)}

					{users.map((attendee) => (
						<div
							key={attendee.userId}
							className='w-full rounded py-1 flex flex-row items-center gap-2 px-1 transition-colors hover:bg-purple-100'
						>
							<img
								className='rounded-full h-8 w-8 object-cover'
								src={
									typeof attendee.avatarUrl === 'string'
										? attendee.avatarUrl
										: '/default-avatar.png'
								}
								alt={
									typeof attendee.displayName === 'string'
										? (attendee.userName as string)
										: attendee.name + ' ' + attendee.surname
								}
							/>

							<p className='w-full text-left truncate'>
								{attendee.username}
								{attendee.userId === userId
									? `${attendee.name} ${attendee.surname} (you)`
									: `${attendee.name} ${attendee.surname}`}
							</p>

							{attendee.role === 'admin' && (
								<FaCrown size={18} className='text-yellow-500 flex-shrink-0' />
							)}

							{userId !== attendee.userId &&
								users.find((u) => u.userId === userId)?.role === 'admin' && (
									<button
										onClick={() => kickUser(attendee.userId)}
										className='flex-shrink-0'
									>
										<TbLogout
											size={18}
											className='transition-colors text-gray-300 hover:text-black'
										/>
									</button>
								)}
						</div>
					))}
				</div>
			)}
		</>
	);
}
