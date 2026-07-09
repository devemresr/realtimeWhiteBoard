import { useState } from 'react';
import CustomInput from './customInput';
import CustomTextArea from './customTextArea';
import { useCreateRoom } from 'src/hooks/api/endpoints/useFormPosts';
import { toast } from 'react-toastify';
import logger from 'src/util/logger';
import { useRoomStatusStore } from 'src/store/RoomStore';
import { RoomData } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { ROOM_ROUTES } from 'src/constants/routes.constant';
type CreateRoomForm = Omit<
	RoomData,
	'createdBy' | 'banned' | 'roomId' | 'roomStatus'
> & {
	isPrivate: boolean;
	password: string;
};
interface CreateRoomProps {
	onSwitchToJoin: () => void;
}

export default function CreateRoom({ onSwitchToJoin }: CreateRoomProps) {
	const [roomForm, setRoomForm] = useState<CreateRoomForm>({
		name: '',
		description: '',
		isLocked: true,
		isPrivate: false,
		password: '',
	});
	const createRoom = useCreateRoom();
	// const { closeModal } = useModalStore();
	const setRoomStatus = useRoomStatusStore((state) => state.setRoom);

	const handleRoomForm = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;

		setRoomForm((prev) => ({
			...prev,
			[name]:
				e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
					? e.target.checked
					: value,
		}));
	};

	const queryClient = useQueryClient();
	const handleCreateRoom = async () => {
		logger.debug({ roomForm }, 'handlecreateroom');
		await createRoom.mutateAsync(
			{
				...roomForm,
				isLocked: !roomForm.isLocked,
				password: passwordActive ? roomForm.password : null,
			},
			{
				onSuccess: (data) => {
					logger.debug({ data });

					queryClient.invalidateQueries({
						queryKey: [ROOM_ROUTES.LIST_ACTIVE, null],
					});

					toast.success(
						`Successfuly created room you can share: ${data.roomId}`,
					);
					onSwitchToJoin();
				},

				onError: (error) => {
					logger.error(error);
					toast.error('Could not create room');
				},
			},
		);
	};
	const [passwordActive, setPasswordActive] = useState(false);
	const roomDataConfig = [
		{ name: 'isPrivate', title: 'Private Room', value: roomForm.isPrivate },
		{
			name: 'isLocked',
			title: 'Open for joining',
			value: roomForm.isLocked,
		},
	];

	return (
		<div className='flex flex-col gap-4 pt-2 overflow-hidden transition-all duration-[800ms] ease-in-out'>
			<CustomInput
				title='Name'
				area='name'
				placeholder='Room name'
				onChange={(e) => handleRoomForm(e)}
				value={roomForm.name}
			/>
			<CustomTextArea
				title='Description'
				area='description'
				placeholder='Room description'
				onChange={(e) => handleRoomForm(e)}
				value={roomForm.description}
				props={{ maxLength: 125, rows: 3 }}
			/>
			{roomDataConfig.map((e) => (
				<label key={e.name} className='inline-flex items-center'>
					<input
						type='checkbox'
						name={e.name}
						checked={Boolean(e.value)}
						onChange={handleRoomForm}
						className='sr-only peer'
					/>
					<div className="relative w-9 h-5 border border-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[calc(100%-2px)] rtl:peer-checked:after:-translate-x-[calc(100%-2px)] peer-checked:after:border-buffer peer-checked:after:bg-purple-600 after:content-[''] after:absolute after:top-[1px] after:start-[2px] after:bg-gray-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
					<span className='select-none ms-3 text-sm font-medium text-heading'>
						{e.title}
					</span>
				</label>
			))}
			<div className={`relative ${passwordActive ? '-top-6' : ''}`}>
				<label
					className={`relative inline-flex items-center transition-all duration-[350ms] ease-in-out ${
						passwordActive ? 'left-20 top-7' : 'left-0 top-0'
					}`}
				>
					<input
						type='checkbox'
						checked={passwordActive}
						onChange={() => setPasswordActive((prev) => !prev)}
						className='sr-only peer'
					/>
					<div className="relative w-9 h-5 border border-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[calc(100%-2px)] rtl:peer-checked:after:-translate-x-[calc(100%-2px)] peer-checked:after:border-buffer peer-checked:after:bg-purple-600 after:content-[''] after:absolute after:top-[1px] after:start-[2px] after:bg-gray-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
					{!passwordActive && (
						<span className='select-none ms-3 text-sm font-medium text-heading'>
							Password
						</span>
					)}
				</label>
				<CustomInput
					title='Password'
					area='password'
					placeholder='123456'
					onChange={(e) => handleRoomForm(e)}
					value={roomForm.password}
					className={`overflow-hidden transition-all duration-[350ms] ease-in-out ${
						passwordActive ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
					}`}
				/>
			</div>
			<button
				onClick={() => {
					console.log('button clicked');
					handleCreateRoom();
				}}
				className='bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out'
				type='button'
			>
				Create Room
			</button>
		</div>
	);
}
