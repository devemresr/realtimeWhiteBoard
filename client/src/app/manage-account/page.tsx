'use client';
import { useState } from 'react';
import CustomInput from 'src/components/customInput';
import UploadAvatar from 'src/components/uploadAvatar';
import { authFormData } from 'src/modals/config';
import { useUserStore } from 'src/store/UserStore';
import { FaRegEdit } from 'react-icons/fa';
import { FaEdit } from 'react-icons/fa';

export default function ManageAccountPage() {
	const [editModeActive, setEditModeActive] = useState(false);
	const [editedData, setEditedData] = useState({
		name: '',
		username: '',
		email: '',
	});
	const [formRegExPassed, setFormRegExPassed] = useState({
		name: false,
		username: false,
		email: false,
	});
	const userStore = useUserStore();
	const handleSave = () => {
		const changes = Object.fromEntries(
			Object.entries(editedData).filter(
				([key, value]) => value.trim() !== '' && value !== userStore[key],
			),
		);
		if (Object.keys(changes).length > 0) {
			userStore.setUser(changes); // only update if theres a change
		} else {
			console.log('No changes made.');
		}
	};
	const handleAuthForm = (e) => {
		setEditedData((prev) => ({
			...prev,
			[e.target.name]: e.target.value,
		}));
		setFormRegExPassed((prev) => ({
			...prev,
			[e.target.name]: authFormData[e.target.name].validationRegex.test(
				e.target.value,
			),
		}));
	};
	const config = authFormData;
	return (
		<div
			style={{ width: 512 }}
			className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col p-4 border border-gray-300 shadow-md justify-center align-center rounded-xl'
		>
			<button
				className='absolute top-4 right-4'
				onClick={() => setEditModeActive((prev) => !prev)}
			>
				{editModeActive ? (
					<FaEdit className='text-gray-600 hover:text-gray-700' size={22} />
				) : (
					<FaRegEdit className='text-gray-400 hover:text-gray-700' size={22} />
				)}
			</button>
			<h1 className='font-semibold self-center text-2xl text-gray-700 my-4'>
				Account Details
			</h1>
			<div className='flex gap-4'>
				<UploadAvatar size='l' />
				<div className='w-full'>
					{Object.keys(editedData).map((key) => {
						const e = config[key];
						const value = editedData[key];
						const isEmpty = !value || value.length === 0;
						const isValid = formRegExPassed[key];
						const isInvalid = !isEmpty && !isValid;
						return editModeActive ? (
							<CustomInput
								key={key + 10}
								//title={e.title}
								isInvalid={isInvalid}
								area={key}
								placeholder={userStore[key]}
								onChange={(e) => handleAuthForm(e)}
								value={value}
								className='w-full my-2'
								validationMessage={authFormData[key].validationMessage}
							/>
						) : (
							<p className='self-center text-lg text-gray-600 my-4'>
								{userStore[key]}
							</p>
						);
					})}
				</div>
			</div>
			<button
				onClick={handleSave}
				className={`bg-purple-500 w-min self-center text-white px-4 py-1.5 rounded-lg hover:bg-purple-600 transition-all duration-300 ease-in-out ${editModeActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
			>
				Save
			</button>
		</div>
	);
}
