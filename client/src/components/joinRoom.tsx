import { useEffect, useState } from 'react';
import CustomInput from './customInput';
import CustomPagination from './customPagination';
import { FaRegUser } from 'react-icons/fa';
import { FaCircle } from 'react-icons/fa';
import { useGetRooms } from 'src/hooks/api/endpoints/useFormPosts';
import logger from 'src/util/loggerTest';

export default function JoinRoom() {
	const [roomForm, setRoomForm] = useState({ roomId: '', password: '' });
	const [listPasswords, setListPasswords] = useState<Record<string, string>>(
		{},
	);

	const [foundRoom, setFoundRoom] = useState(null);
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!roomForm.roomId) {
				setFoundRoom(null);
				setShowPassword(false);
				return;
			}
			const room = data?.rooms.find(
				// todo is this the correct data, is it returning all the rooms private included if not should be changed
				(r) => r.roomId.toLowerCase() === roomForm.roomId.toLowerCase(),
			);
			setFoundRoom(room || null);
			setShowPassword(!!room?.password?.length);
		}, 700);
		return () => clearTimeout(timer);
	}, [roomForm.roomId]);
	const dummyRooms = [
		{
			name: 'Frontend Study Group',
			roomId: 'FRONT123',
			private: false,
			password: '',
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
			memberCount: 12,
		},
		{
			name: 'Algorithms Workshop',
			roomId: 'ALG456',
			private: true,
			password: 'algo2026',
			owner: {
				id: 'u002',
				username: 'cs_prof',
				displayName: 'Michael Chen',
				email: 'michael.chen@example.com',
				avatar: 'https://i.pravatar.cc/150?img=2',
				role: 'owner',
				isOnline: false,
				joinedAt: '2026-06-08T14:30:00Z',
			},
			memberCount: 8,
		},
		{
			name: 'UI Design Review',
			roomId: 'DESIGN88',
			private: true,
			password: '',
			owner: {
				id: 'u003',
				username: 'ux_sarah',
				displayName: 'Sarah Miller',
				email: 'sarah.miller@example.com',
				avatar: 'https://i.pravatar.cc/150?img=3',
				role: 'owner',
				isOnline: true,
				joinedAt: '2026-06-10T11:15:00Z',
			},
			memberCount: 15,
		},
		{
			name: 'Project Team Alpha',
			roomId: 'ALPHA42',
			private: false,
			password: 'teamalpha',
			owner: {
				id: 'u004',
				username: 'lead_dev',
				displayName: 'David Rodriguez',
				email: 'david.rodriguez@example.com',
				avatar: 'https://i.pravatar.cc/150?img=4',
				role: 'owner',
				isOnline: true,
				joinedAt: '2026-06-07T16:45:00Z',
			},
			memberCount: 5,
		},
		{
			name: 'Photography Challenge',
			roomId: 'PHOTO99',
			private: false,
			password: '',
			owner: {
				id: 'u005',
				username: 'lensmaster',
				displayName: 'Emma Carter',
				email: 'emma.carter@example.com',
				avatar: 'https://i.pravatar.cc/150?img=5',
				role: 'owner',
				isOnline: false,
				joinedAt: '2026-06-06T08:20:00Z',
			},
			memberCount: 24,
		},
		{
			name: 'Exam Preparation',
			roomId: 'EXAM2026',
			private: true,
			password: 'studyhard',
			owner: {
				id: 'u006',
				username: 'mentor_ali',
				displayName: 'Ali Demir',
				email: 'ali.demir@example.com',
				avatar: 'https://i.pravatar.cc/150?img=6',
				role: 'owner',
				isOnline: true,
				joinedAt: '2026-06-05T18:00:00Z',
			},
			memberCount: 18,
		},
		{
			name: 'React Native Help',
			roomId: 'RNHELP',
			private: false,
			password: '',
			owner: {
				id: 'u007',
				username: 'mobile_guru',
				displayName: 'Lucas Brown',
				email: 'lucas.brown@example.com',
				avatar: 'https://i.pravatar.cc/150?img=7',
				role: 'owner',
				isOnline: true,
				joinedAt: '2026-06-10T13:40:00Z',
			},
			memberCount: 31,
		},
		{
			name: 'Secret Project',
			roomId: 'SECRETX',
			private: false,
			password: 'classified',
			owner: {
				id: 'u008',
				username: 'project_lead',
				displayName: 'Olivia Johnson',
				email: 'olivia.johnson@example.com',
				avatar: 'https://i.pravatar.cc/150?img=8',
				role: 'owner',
				isOnline: false,
				joinedAt: '2026-06-04T21:10:00Z',
			},
			memberCount: 3,
		},
	];

	const handleRoomFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRoomForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleListPasswordChange = (code: string, value: string) => {
		setListPasswords((prev) => ({ ...prev, [code]: value }));
	};

	const handleSelectRoom = (code: string) => {
		setSelectedRoomCode((prev) => (prev === code ? null : code));
		// Don't carry over a password from a previously selected room
		setListPasswords((prev) => {
			const next = { ...prev };
			delete next[code];
			return next;
		});
	};

	const handleJoinByCode = () => {
		if (!foundRoom) return;
		const password = roomForm.password;
		// join logic here
		// todo add api call for join
	};

	// List flow
	const handleJoinFromList = (room) => {
		const password = listPasswords[room.code] ?? '';
		// join logic here
	};

	const { data, isLoading, isError, error } = useGetRooms();
	const publicRooms = data?.rooms ?? [];
	const [paginationPageNumber, setPaginationPageNumber] = useState(1);
	const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
	const itemsPerPage = 3;
	const lastIndex = paginationPageNumber * itemsPerPage;
	const firstIndex = lastIndex - itemsPerPage;
	const paginatedRooms = publicRooms.slice(firstIndex, lastIndex);
	const pageAmount = Math.ceil(publicRooms.length / itemsPerPage);
	console.log('fatma', data);
	return (
		<div className='max-w-96'>
			<div className='flex flex-col gap-2'>
				<div className='flex flex-row gap-2 pt-2'>
					<CustomInput
						area='code'
						title='Enter code'
						placeholder='Room Code'
						onChange={handleRoomFormChange}
						value={roomForm.roomId}
						className='w-full'
					/>
					<button
						disabled={!foundRoom}
						onClick={handleJoinByCode}
						className='bg-purple-500 self-end text-white px-4 py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out disabled:bg-gray-300 disabled:text-gray-500'
					>
						Join
					</button>
				</div>
				{showPassword && (
					<CustomInput
						area='password'
						title='password'
						placeholder='Password'
						onChange={handleRoomFormChange}
						value={roomForm.password}
						className='w-full'
					/>
				)}
			</div>

			<div className='w-full h-0.5 bg-gray-200 my-2' />

			<div className='flex flex-col gap-4 pt-2 overflow-hidden'>
				{paginatedRooms.map((room) => {
					const isSelected = selectedRoomCode === room.roomId;
					return (
						<div
							key={room.roomId}
							className='border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow duration-300 ease-in-out'
							onClick={() => handleSelectRoom(room.roomId)}
						>
							<span className='flex justify-between items-center'>
								<div className='flex items-center gap-1'>
									<FaCircle
										size={10}
										color={room.roomStatus === 'ACTIVE' ? 'green' : 'red'}
									/>
									<h3>{room.name}</h3>
								</div>
								<div className='flex items-baseline gap-1'>
									<FaRegUser
										style={{ position: 'relative', top: 1 }}
										className='text-gray-600'
										size={14}
									/>
									<p className='text-gray-600'>{room.memberCount}</p>
								</div>
							</span>

							{isSelected && (
								<>
									<p className='text-gray-500 text-left text-sm'>
										{room.roomId}
									</p>
									{room.description && (
										<p className='text-gray-600 text-left text-sm '>
											{room.description}
										</p>
									)}
								</>
							)}

							<div
								className={`transition-all duration-400 ease-in-out overflow-hidden ${
									isSelected ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
								}`}
							>
								{!!room.password ? (
									<div className='flex gap-2 items-center'>
										<CustomInput
											area='password'
											title='password'
											placeholder='Password'
											onChange={(e) =>
												handleListPasswordChange(room.code, e.target.value)
											}
											value={listPasswords[room.code] ?? ''}
											className='w-full'
										/>
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleJoinFromList(room);
											}}
											className='bg-purple-500 self-end text-white px-4 py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out'
										>
											Join
										</button>
									</div>
								) : (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleJoinFromList(room);
										}}
										className='w-full bg-purple-500 text-white py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out'
									>
										Join
									</button>
								)}
							</div>
						</div>
					);
				})}
				<CustomPagination
					paginationPageNumber={paginationPageNumber}
					setPaginationPageNumber={setPaginationPageNumber}
					pageAmount={pageAmount}
				/>
			</div>
		</div>
	);
}
