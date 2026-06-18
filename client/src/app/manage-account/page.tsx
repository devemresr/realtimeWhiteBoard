'use client';

import { useState } from 'react';
import { FaEdit, FaRegEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';

import CustomInput from 'src/components/customInput';
import UploadAvatar from 'src/components/uploadAvatar';
import { authFormData } from 'src/modals/config';
import { useUserStore } from 'src/store/UserStore';

export default function ManageAccountPage() {
	const userStore = useUserStore();
	const setUser = useUserStore((state) => state.setUser);

	const [editModeActive, setEditModeActive] = useState(false);

	const [editedData, setEditedData] = useState({
		avatarUrl: userStore.avatarUrl ?? '',
		name: userStore.name ?? '',
		username: userStore.username ?? '',
		surname: userStore.surname ?? '',
		email: userStore.email ?? '',
	});

	const [formRegExPassed, setFormRegExPassed] = useState({
		name: true,
		username: true,
		surname: true,
		email: true,
	});

	const editableAreas = ['name', 'surname', 'username', 'email'] as const;
	const nameAndSurnameAreas = ['name', 'surname'] as const;
	const remainingAreas = editableAreas.filter(
		(area) => area !== 'name' && area !== 'surname',
	);

	const isFormValid = editableAreas.every((area) => formRegExPassed[area]);

	const handleAccountForm = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		const trimmed = value.trim();

		setEditedData((prev) => ({
			...prev,
			[name]: trimmed,
		}));

		setFormRegExPassed((prev) => ({
			...prev,
			[name]: authFormData[name].validationRegex.test(trimmed),
		}));
	};

	const handleSave = () => {
		if (!isFormValid) {
			toast.error('Please fix invalid fields.');
			return;
		}

		const changes = Object.fromEntries(
			Object.entries(editedData).filter(([key, value]) => {
				return value.trim() !== '' && value !== userStore[key];
			}),
		);

		if (Object.keys(changes).length === 0) {
			toast.info('No changes made.');
			return;
		}

		setUser(changes);
		setEditModeActive(false);
		toast.success('Account updated successfully!');
	};

	return (
		<div className='absolute top-1/2 left-1/2 w-[512px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-300 p-6 shadow-md'>
			<button
				className='absolute right-4 top-4'
				onClick={() => setEditModeActive((prev) => !prev)}
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
						Account Details
					</h1>
					<p className='text-center text-gray-600'>
						View and update your profile information.
					</p>
				</div>

				<div className='flex justify-center'>
					<UploadAvatar
						avatar={editedData.avatarUrl}
						setAvatar={(url) =>
							setEditedData((prev) => ({
								...prev,
								avatarUrl: url,
							}))
						}
					/>
				</div>

				{editModeActive ? (
					<>
						<div className='flex flex-col gap-1'>
							<div className='flex gap-2'>
								{nameAndSurnameAreas.map((area) => {
									const value = editedData[area];
									const isEmpty = value.length === 0;
									const isInvalid = !isEmpty && !formRegExPassed[area];

									return (
										<CustomInput
											key={area}
											title={authFormData[area].title}
											isInvalid={isInvalid}
											area={area}
											placeholder={authFormData[area].placeholder}
											onChange={handleAccountForm}
											value={value}
											validationMessage={null}
										/>
									);
								})}
							</div>

							{nameAndSurnameAreas.map((area) => {
								const value = editedData[area];
								const isInvalid = value.length > 0 && !formRegExPassed[area];

								return isInvalid ? (
									<p key={`${area}-error`} className='text-xs text-red-500'>
										<span className='font-medium capitalize'>{area}:</span>{' '}
										{authFormData[area].validationMessage}
									</p>
								) : null;
							})}
						</div>

						{remainingAreas.map((area) => {
							const value = editedData[area];
							const isEmpty = value.length === 0;
							const isInvalid = !isEmpty && !formRegExPassed[area];

							return (
								<CustomInput
									key={area}
									title={authFormData[area].title}
									isInvalid={isInvalid}
									area={area}
									placeholder={authFormData[area].placeholder}
									onChange={handleAccountForm}
									value={value}
									validationMessage={authFormData[area].validationMessage}
								/>
							);
						})}

						<button
							onClick={handleSave}
							disabled={!isFormValid}
							className='rounded-lg bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500'
						>
							Save Changes
						</button>
					</>
				) : (
					<div className='flex flex-col gap-3'>
						{editableAreas.map((area) => (
							<div key={area} className='rounded-lg bg-gray-50 p-3'>
								<p className='text-xs font-medium text-gray-400'>
									{authFormData[area].title}
								</p>
								<p className='text-gray-700'>{userStore[area]}</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
