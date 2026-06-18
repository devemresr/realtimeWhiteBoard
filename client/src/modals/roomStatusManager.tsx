'use client';

import { useEffect, useState } from 'react';
import { FaEdit, FaRegEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';

import CustomInput from 'src/components/customInput';
import { RoomStatus } from '@/types';
import { useRoomStatusStore } from 'src/store/RoomStore';
import { useChangeRoomStatus } from 'src/hooks/api/endpoints/useFormPosts';

const roomStatusOptions = [
	RoomStatus.ACTIVE,
	RoomStatus.LOCKED,
	RoomStatus.PRIVATE,
] as const;

type RoomSettingsForm = {
	name: string;
	description: string;
	maxMemberCount: string;
	password: string;
	roomStatus: RoomStatus;
};

export default function RoomSettingsModal() {
	const roomId = useRoomStatusStore((state) => state.roomId);
	const roomStatus = useRoomStatusStore((state) => state.status);
	const roomName = useRoomStatusStore((state) => state.name);
	const roomDescription = useRoomStatusStore((state) => state.description);
	const maxMemberCount = useRoomStatusStore((state) => state.maxMemberCount);
	const setRoom = useRoomStatusStore((state) => state.setRoom);

	const changeRoomSettings = useChangeRoomStatus();

	const [editModeActive, setEditModeActive] = useState(false);

	const [editedRoom, setEditedRoom] = useState<RoomSettingsForm>({
		name: roomName ?? '',
		description: roomDescription ?? '',
		maxMemberCount: maxMemberCount != null ? String(maxMemberCount) : '',
		password: '',
		roomStatus: (roomStatus as RoomStatus) ?? RoomStatus.ACTIVE,
	});

	useEffect(() => {
		setEditedRoom({
			name: roomName ?? '',
			description: roomDescription ?? '',
			maxMemberCount: maxMemberCount != null ? String(maxMemberCount) : '',
			password: '',
			roomStatus: (roomStatus as RoomStatus) ?? RoomStatus.ACTIVE,
		});
	}, [roomName, roomDescription, maxMemberCount, roomStatus]);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;

		setEditedRoom((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSave = async () => {
		if (!roomId) {
			toast.error('Room id is missing.');
			return;
		}

		const maxMemberCount =
			editedRoom.maxMemberCount.trim() === ''
				? null
				: Number(editedRoom.maxMemberCount);

		if (
			maxMemberCount !== null &&
			(Number.isNaN(maxMemberCount) || maxMemberCount < 1)
		) {
			toast.error('Max members must be a positive number.');
			return;
		}

		const payload: Record<string, unknown> = {
			roomId,
		};

		if (editedRoom.name.trim() !== roomName) {
			payload.name = editedRoom.name.trim();
		}

		if ((editedRoom.description ?? '').trim() !== (roomDescription ?? '')) {
			payload.description = editedRoom.description.trim();
		}

		if (maxMemberCount !== (maxMemberCount ?? null)) {
			payload.maxMemberCount = maxMemberCount;
		}

		if (editedRoom.roomStatus !== roomStatus) {
			payload.roomStatus = editedRoom.roomStatus;
		}

		if (editedRoom.password.trim() !== '') {
			payload.password = editedRoom.password;
		}

		if (Object.keys(payload).length === 1) {
			toast.info('No changes made.');
			setEditModeActive(false);
			return;
		}

		try {
			const data = await changeRoomSettings.mutateAsync(payload);

			const updatedRoom = data.room ?? {};

			setRoom({
				roomId,
				name: updatedRoom.name ?? editedRoom.name.trim(),
				description: updatedRoom.description ?? editedRoom.description.trim(),
				maxMemberCount: updatedRoom.maxMemberCount ?? maxMemberCount,
				status: updatedRoom.roomStatus ?? editedRoom.roomStatus,
			});

			setEditedRoom((prev) => ({
				...prev,
				password: '',
			}));

			setEditModeActive(false);
			toast.success('Room settings updated successfully!');
		} catch (error: any) {
			toast.error(
				error?.response?.data?.error ??
					error?.response?.data?.message ??
					error?.message ??
					'Could not update room settings',
			);
		}
	};

	return (
		<div className='w-[512px] rounded-xl border border-gray-300 p-6 shadow-md'>
			<button
				className='float-right'
				onClick={() => setEditModeActive((prev) => !prev)}
				type='button'
			>
				{editModeActive ? (
					<FaEdit className='text-gray-600 hover:text-gray-700' size={22} />
				) : (
					<FaRegEdit className='text-gray-400 hover:text-gray-700' size={22} />
				)}
			</button>

			<div className='flex flex-col gap-4'>
				<div>
					<h1 className='text-center text-2xl font-semibold text-gray-800'>
						Room Settings
					</h1>
					<p className='text-center text-gray-600'>
						View and update room details.
					</p>
				</div>

				{editModeActive ? (
					<>
						<CustomInput
							area='name'
							title='Room Name'
							placeholder='Room name'
							value={editedRoom.name}
							onChange={handleChange}
							className='w-full'
						/>

						<div className='flex flex-col gap-1'>
							<label className='text-sm font-medium text-gray-700'>
								Description
							</label>
							<textarea
								name='description'
								placeholder='Room description'
								value={editedRoom.description}
								onChange={handleChange}
								className='min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-purple-500'
							/>
						</div>

						<CustomInput
							area='maxMemberCount'
							title='Max Members'
							placeholder='Leave empty for unlimited'
							value={editedRoom.maxMemberCount}
							onChange={handleChange}
							className='w-full'
						/>

						<CustomInput
							area='password'
							title='New Password'
							placeholder='Leave empty to keep current password'
							value={editedRoom.password}
							onChange={handleChange}
							className='w-full'
						/>

						<div className='flex flex-col gap-2'>
							<p className='text-sm font-medium text-gray-700'>Room Status</p>

							{roomStatusOptions.map((status) => {
								const isSelected = editedRoom.roomStatus === status;

								return (
									<button
										key={status}
										type='button'
										onClick={() =>
											setEditedRoom((prev) => ({
												...prev,
												roomStatus: status,
											}))
										}
										className={`rounded-lg border p-3 text-left transition-colors ${
											isSelected
												? 'border-purple-500 bg-purple-50 text-purple-700'
												: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
										}`}
									>
										<p className='font-medium'>{status}</p>

										<p className='text-xs text-gray-500'>
											{status === RoomStatus.ACTIVE &&
												'Room is listed and users can join.'}
											{status === RoomStatus.LOCKED &&
												'Room is listed, but users cannot join yet.'}
											{status === RoomStatus.PRIVATE &&
												'Room is hidden from the public room list.'}
										</p>
									</button>
								);
							})}
						</div>

						<button
							onClick={handleSave}
							disabled={changeRoomSettings.isPending}
							className='rounded-lg bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500'
							type='button'
						>
							{changeRoomSettings.isPending ? 'Saving...' : 'Save Changes'}
						</button>
					</>
				) : (
					<div className='flex flex-col gap-3'>
						<div className='rounded-lg bg-gray-50 p-3'>
							<p className='text-xs font-medium text-gray-400'>Room Name</p>
							<p className='text-gray-700'>{roomName || 'Untitled Room'}</p>
						</div>

						<div className='rounded-lg bg-gray-50 p-3'>
							<p className='text-xs font-medium text-gray-400'>Description</p>
							<p className='text-gray-700'>
								{roomDescription || 'No description'}
							</p>
						</div>

						<div className='rounded-lg bg-gray-50 p-3'>
							<p className='text-xs font-medium text-gray-400'>Max Members</p>
							<p className='text-gray-700'>{maxMemberCount ?? 'Unlimited'}</p>
						</div>

						<div className='rounded-lg bg-gray-50 p-3'>
							<p className='text-xs font-medium text-gray-400'>
								Current Status
							</p>
							<p className='text-gray-700'>{roomStatus}</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
