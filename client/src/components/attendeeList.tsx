import { useEffect, useState } from 'react';
import { FaCrown } from 'react-icons/fa';
import { TbLogout } from 'react-icons/tb';
import { PiUsersThree } from 'react-icons/pi';
import { useUserStore } from 'src/store/UserStore';
import { MdContentCopy } from 'react-icons/md';
export default function AttendeeList() {
	const [active, setActive] = useState(false);
	const { userId } = useUserStore();
	const loggedIn = !!userId;
	const canvasCode = 'FA353Y';
	const attendeeList = {
		owner: {
			id: 'u001',
			username: 'teacher_jane',
			displayName: 'Jane Wilson',
			email: 'jane.wilson@example.com',
			avatar: 'https://i.pravatar.cc/150?img=1',
			role: 'owner',
			isOnline: true,
			joinedAt: '2026-06-09T09:00:00Z',
		},

		editors: [
			{
				id: 'u002',
				username: 'alex23',
				displayName: 'Alex Carter',
				email: 'alex.carter@example.com',
				avatar: 'https://i.pravatar.cc/150?img=2',
				role: 'editor',
				isOnline: true,
				joinedAt: '2026-06-09T09:03:00Z',
			},
			{
				id: 'u003',
				username: 'sophia_dev',
				displayName: 'Sophia Martinez',
				email: 'sophia.martinez@example.com',
				avatar: 'https://i.pravatar.cc/150?img=3',
				role: 'editor',
				isOnline: true,
				joinedAt: '2026-06-09T09:05:00Z',
			},
			{
				id: 'u004',
				username: 'liam_design',
				displayName: 'Liam Brown',
				email: 'liam.brown@example.com',
				avatar: 'https://i.pravatar.cc/150?img=4',
				role: 'editor',
				isOnline: false,
				joinedAt: '2026-06-09T09:08:00Z',
			},
		],

		viewers: [
			{
				id: 'u005',
				username: 'emma01',
				displayName: 'Emma Davis',
				email: 'emma.davis@example.com',
				avatar: 'https://i.pravatar.cc/150?img=5',
				role: 'viewer',
				isOnline: true,
				joinedAt: '2026-06-09T09:10:00Z',
			},
			{
				id: 'u006',
				username: 'noah_student',
				displayName: 'Noah Johnson',
				email: 'noah.johnson@example.com',
				avatar: 'https://i.pravatar.cc/150?img=6',
				role: 'viewer',
				isOnline: false,
				joinedAt: '2026-06-09T09:12:00Z',
			},
			{
				id: 'u007',
				username: 'olivia_k',
				displayName: 'Olivia King',
				email: 'olivia.king@example.com',
				avatar: 'https://i.pravatar.cc/150?img=7',
				role: 'viewer',
				isOnline: true,
				joinedAt: '2026-06-09T09:14:00Z',
			},
		],
	};
	const kickUser = (id) => {
		// todo kick  user
	};
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(canvasCode);
			console.log('Copied!');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};
	return !loggedIn ? null : (
		<>
			<button
				onClick={() => setActive(!active)}
				className={`w-8 h-8 bg-gray-100  shadow p-1.5 items-center justify-center rounded transition-colors hover:bg-purple-100 fixed right-2 top-2`}
			>
				<PiUsersThree size={20} />
			</button>
			{active && (
				<div
					style={{ width: 260, maxHeight: 600, minHeight: 200, zIndex: 1 }}
					className='overflow-y-auto container fixed right-2 top-12 bg-white border rounded-lg border-gray-200 p-2 shadow flex flex-col gap-1'
				>
					<div className='flex gap-2'>
						<h1 className='text-md text-gray-700'>{canvasCode}</h1>
						<button
							className='text-gray-600 hover:text-gray-800'
							onClick={handleCopy}
						>
							<MdContentCopy />
						</button>
					</div>
					<div className='w-full h-0.5 bg-gray-100' />
					{Object.entries(attendeeList).map(([role, list]) => {
						if (!Array.isArray(list)) {
							return (
								<button
									key={list.id}
									className='w-full rounded py-1 flex flex-row items-center gap-1 px-1 transition-colors hover:bg-purple-100'
								>
									<img
										className='rounded-full h-8 w-8'
										src={list.avatar}
										alt={list.displayName}
									/>
									<p className='w-full text-left'>{list.displayName}</p>
									<FaCrown size={24} />
								</button>
							);
						}
						return list.map((attendee) => (
							<button
								key={attendee.id}
								className='w-full rounded py-1 flex flex-row items-center gap-1 px-1 transition-colors hover:bg-purple-100'
							>
								<img
									className='rounded-full h-8 w-8'
									src={attendee.avatar}
									alt={attendee.displayName}
								/>
								<p className='w-full text-left'>{attendee.displayName}</p>
								{userId === attendeeList.owner.id && (
									<button onClick={() => kickUser(attendee.id)}>
										<TbLogout
											className='transition-colors text-gray-300 hover:text-black'
											size={18}
										/>
									</button>
								)}
							</button>
						));
					})}
				</div>
			)}
		</>
	);
}
