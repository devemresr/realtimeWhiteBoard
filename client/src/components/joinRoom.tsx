import { useState } from 'react';
import CustomInput from './customInput';
import CustomPagination from './customPagination';
import { FaRegUser, FaCircle } from 'react-icons/fa';
import { useGetRooms } from 'src/hooks/api/endpoints/useFormPosts';
import { useEnterRoom } from 'src/hooks/canvas/room/useEnterRoom';
import { toast } from 'react-toastify';
import { RoomStatus } from '@/types';
import logger from 'src/util/logger';
import { useOnboardingSync } from 'src/hooks/networking/synchronization/useOnboardingSync';

export default function JoinRoom() {
	const [roomForm, setRoomForm] = useState({ roomId: '', password: '' });
	const [listPasswords, setListPasswords] = useState<Record<string, string>>(
		{},
	);
	const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
	const [paginationPageNumber, setPaginationPageNumber] = useState(1);
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

	const { data, isLoading, isError } = useGetRooms();
	logger.debug({ rooms: data?.rooms });
	const { enterRoom } = useEnterRoom();

	const publicRooms = (data?.rooms ?? []).filter(
		(room) => room.roomStatus !== RoomStatus.PRIVATE,
	);
	const itemsPerPage = 3;
	const lastIndex = paginationPageNumber * itemsPerPage;
	const firstIndex = lastIndex - itemsPerPage;
	const paginatedRooms = publicRooms.slice(firstIndex, lastIndex);
	const pageAmount = Math.ceil(publicRooms.length / itemsPerPage);

	const enteredRoom = publicRooms.find(
		(r) => r.roomId === roomForm.roomId.trim(),
	);
	const enteredRoomRequiresPassword = enteredRoom?.hasPassword;

	const handleRoomFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRoomForm((prev) => ({
			...prev,
			[e.target.name]: e.target.value,
		}));
	};

	const handleListPasswordChange = (roomId: string, value: string) => {
		setListPasswords((prev) => ({
			...prev,
			[roomId]: value,
		}));
	};

	const handleSelectRoom = (roomId: string) => {
		setSelectedRoomId((prev) => (prev === roomId ? null : roomId));
	};

	const joinRoomHandler = async (roomId: string, password?: string) => {
		if (!roomId.trim()) return;
		setPendingRoomId(roomId);

		try {
			await enterRoom(roomId, password);
		} catch (err: any) {
			toast.error(err.message ?? 'Failed to join room');
			setRoomForm((prev) => ({ ...prev, password: '' }));
			setListPasswords((prev) => ({ ...prev, [roomId]: '' }));
		} finally {
			setPendingRoomId(null);
		}
	};

	const handleJoinByCode = async () => {
		await joinRoomHandler(roomForm.roomId, roomForm.password);
	};

	const handleJoinFromList = async (room: any) => {
		const password = listPasswords[room.roomId] ?? '';
		await joinRoomHandler(room.roomId, password);
	};

	const getMemberText = (
		memberCount: number,
		maxMemberCount?: number | null,
	): string => {
		if (maxMemberCount != null) {
			return `${memberCount}/${maxMemberCount}`;
		}
		return memberCount.toString();
	};

	const trimmedRoomId = roomForm.roomId.trim();
	const isJoinByCodePending = pendingRoomId === trimmedRoomId;

	return (
		<div className='max-w-96'>
			<div className='flex flex-col gap-2'>
				<div className='flex flex-row gap-2 pt-2'>
					<CustomInput
						area='roomId'
						title='Enter code'
						placeholder='Room Code'
						onChange={handleRoomFormChange}
						value={roomForm.roomId}
						className='w-full'
					/>

					{!enteredRoomRequiresPassword && (
						<button
							disabled={!trimmedRoomId || isJoinByCodePending}
							onClick={handleJoinByCode}
							className='bg-purple-500 self-end text-white px-4 py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed'
							type='button'
						>
							{isJoinByCodePending ? 'Joining...' : 'Join'}
						</button>
					)}
				</div>

				{enteredRoomRequiresPassword && (
					<div className='flex flex-row gap-2'>
						<CustomInput
							area='password'
							title='Password'
							placeholder='Password'
							onChange={handleRoomFormChange}
							value={roomForm.password}
							className='w-full'
						/>

						<button
							disabled={isJoinByCodePending || roomForm.password === ''}
							onClick={handleJoinByCode}
							className='bg-purple-500 self-end text-white px-4 py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed'
							type='button'
						>
							{isJoinByCodePending ? 'Joining...' : 'Join'}
						</button>
					</div>
				)}
			</div>

			<div className='w-full h-0.5 bg-gray-200 my-2' />

			<div className='flex flex-col gap-4 pt-2 overflow-hidden'>
				{isLoading && <p className='text-sm text-gray-500'>Loading rooms...</p>}

				{isError && (
					<p className='text-sm text-red-500'>Could not load rooms.</p>
				)}

				{paginatedRooms.map((room) => {
					const isSelected = selectedRoomId === room.roomId;
					const isRoomPending = pendingRoomId === room.roomId;

					return (
						<div
							key={room.roomId}
							className='border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow duration-300 ease-in-out cursor-pointer'
							onClick={() => handleSelectRoom(room.roomId)}
						>
							<span className='flex justify-between items-center'>
								<div className='flex items-center gap-1'>
									<FaCircle
										size={10}
										color={
											room.roomStatus === RoomStatus.ACTIVE ? 'green' : 'red'
										}
									/>
									<h3>{room.name}</h3>
								</div>

								<div className='flex items-baseline gap-1'>
									<FaRegUser
										style={{ position: 'relative', top: 1 }}
										className='text-gray-600'
										size={14}
									/>
									<p className='text-gray-600'>
										{getMemberText(room.activeUserCount, room.maxMemberCount)}
									</p>
								</div>
							</span>

							{isSelected && (
								<>
									<p className='text-gray-500 text-left text-sm'>
										{room.roomId}
									</p>

									{room.description && (
										<p className='text-gray-600 text-left text-sm'>
											{room.description}
										</p>
									)}

									<div className='text-sm text-gray-600'>
										{room.memberCount}
										{room.maxMemberCount && `/${room.maxMemberCount}`} members
										{room.activeUserCount != null && (
											<>
												<span className='mx-1'>·</span>
												{room.activeUserCount} active
											</>
										)}
									</div>
								</>
							)}

							<div
								className={`transition-all duration-400 ease-in-out overflow-hidden ${
									isSelected ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
								}`}
							>
								<div
									className='flex gap-2 items-center'
									onClick={(e) => e.stopPropagation()}
								>
									{room.hasPassword && (
										<CustomInput
											area='password'
											title='Password'
											placeholder='Password'
											onChange={(e) =>
												handleListPasswordChange(room.roomId, e.target.value)
											}
											value={listPasswords[room.roomId] ?? ''}
											className='w-full'
										/>
									)}

									<button
										onClick={(e) => {
											e.stopPropagation();
											handleJoinFromList(room);
										}}
										className={`bg-purple-500 text-white py-1.5 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${
											room.hasPassword ? 'px-4 self-end' : 'w-full'
										}`}
										disabled={isRoomPending}
										type='button'
									>
										{isRoomPending ? 'Joining...' : 'Join'}
									</button>
								</div>
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
