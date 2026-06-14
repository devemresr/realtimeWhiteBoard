import { useState } from 'react';
import CustomInput from './customInput';

export default function CreateRoom({
	roomForm,
	handleRoomForm,
}: {
	roomForm: any;
	handleRoomForm: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
	const [passwordActive, setPasswordActive] = useState(false);

	return (
		<div className='flex flex-col gap-4 pt-2 overflow-hidden transition-all duration-[800ms] ease-in-out'>
			<CustomInput
				title='Name'
				area='name'
				placeholder='Room123'
				onChange={(e) => handleRoomForm(e)}
				value={roomForm.name}
			/>
			<label className='inline-flex items-center'>
				<input
					type='checkbox'
					name='private'
					value={roomForm.private}
					onChange={handleRoomForm}
					className='sr-only peer'
				/>
				<div className="relative w-9 h-5 border border-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
				<span className='select-none ms-3 text-sm font-medium text-heading'>
					Private
				</span>
			</label>
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
					<div className="relative w-9 h-5 border border-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
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
					className={`transition-all duration-[350ms] ease-in-out ${passwordActive ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
				/>
			</div>
			<button className='bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors duration-300 ease-in-out'>
				Create Room
			</button>
		</div>
	);
}
