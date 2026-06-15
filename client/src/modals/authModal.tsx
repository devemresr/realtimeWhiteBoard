import { useState } from 'react';
import { AuthContentTypes } from './types';
import { authContent, authFormData } from './config';
import CustomInput from 'src/components/customInput';
import UploadAvatar from 'src/components/uploadAvatar';
import { useUserStore } from 'src/store/UserStore';
import { useModalStore } from 'src/store/ModalStore';
import { useLogin, useRegister } from 'src/hooks/api/endpoints/useFormPosts';
import { toast } from 'react-toastify';

export default function AuthModal() {
	const userStore = useUserStore();
	const [authType, setAuthType] = useState<AuthContentTypes>('signIn');
	const { closeModal } = useModalStore();
	const [authForm, setAuthForm] = useState({
		avatar:
			'https://cdn.vectorstock.com/i/500p/71/90/blank-avatar-placeholder-icon-vector-30257190.jpg',
		name: '',
		username: '',
		surname: '',
		email: '',
		password: '',
		confirmPassword: '',
	});
	const [formRegExPassed, setFormRegExPassed] = useState({
		name: false,
		username: false,
		surname: false,
		email: false,
		password: false,
	});

	const isFormValid = authContent[authType].areas.every(
		(area) => formRegExPassed[area],
	);
	const isPasswordCorrect = authForm.password === authForm.confirmPassword;

	const login = useLogin();
	const handleLogin = async () => {
		try {
			await login.mutateAsync({
				email: authForm.email,
				password: authForm.password,
			});
			// todo setuser to store properly set isloggedin true
			userStore.setUser({
				id: '',
				name: '',
				username: '',
				email: authForm.email,
				avatar: '',
			});
			closeModal();
			toast.success('Welcome back!');
		} catch {
			toast.error('Invalid email or password.');
		}
	};

	const register = useRegister();
	const handleSignUp = async () => {
		if (!isPasswordCorrect) {
			toast.error('Passwords do not match.');
			return;
		}
		try {
			await register.mutateAsync({
				email: authForm.email,
				password: authForm.password,
				name: authForm.name,
				surname: authForm.surname,
				username: authForm.username,
				avatar: authForm.avatar,
			});
			userStore.setUser({
				id: 'user-id',
				name: authForm.name,
				username: authForm.username,
				email: authForm.email,
				avatar: authForm.avatar,
			});
			closeModal();
			toast.success('Account created successfully!');
		} catch {
			toast.error('Registration failed. Please try again.');
		}
	};

	const handleAuthForm = (e: React.ChangeEvent<HTMLInputElement>) => {
		const trimmed = e.target.value.trim();
		setAuthForm((prev) => ({
			...prev,
			[e.target.name]: trimmed,
		}));
		setFormRegExPassed((prev) => ({
			...prev,
			[e.target.name]:
				authFormData[e.target.name].validationRegex.test(trimmed),
		}));
	};

	const nameAndSurnameAreas = ['name', 'surname'] as const;
	const remainingAreas = authContent[authType].areas.filter(
		(area) => area !== 'name' && area !== 'surname',
	);

	return (
		<div className='flex flex-col gap-4'>
			<div>
				<h1 className='text-2xl text-center font-semibold text-gray-800'>
					{authContent[authType].title}
				</h1>
				<p className='text-gray-600'>{authContent[authType].text}</p>
			</div>
			{authType === 'signUp' && (
				<UploadAvatar
					avatar={authForm.avatar}
					setAvatar={(url) =>
						setAuthForm((prev) => ({
							...prev,
							avatar: url,
						}))
					}
				/>
			)}
			{authType === 'signUp' && (
				<div className='flex flex-col gap-1'>
					<div className='flex gap-2'>
						{nameAndSurnameAreas.map((area) => {
							const value = authForm[area];
							const isEmpty = !value || value.length === 0;
							const isValid = formRegExPassed[area];
							const isInvalid = !isEmpty && !isValid;
							return (
								<CustomInput
									key={area}
									title={authFormData[area].title}
									isInvalid={isInvalid}
									area={area}
									placeholder={authFormData[area].placeholder}
									onChange={handleAuthForm}
									value={value}
									validationMessage={null} // suppress inline message
								/>
							);
						})}
					</div>
					{/* Render validation messages below the row */}
					{nameAndSurnameAreas.map((area) => {
						const value = authForm[area];
						const isEmpty = !value || value.length === 0;
						const isInvalid = !isEmpty && !formRegExPassed[area];
						return isInvalid ? (
							<p key={`${area}-error`} className='text-red-500 text-xs'>
								<span className='font-medium capitalize'>{area}:</span>{' '}
								{authFormData[area].validationMessage}
							</p>
						) : null;
					})}
				</div>
			)}
			{remainingAreas.map((area) => {
				const value = authForm[area];
				const isEmpty = !value || value.length === 0;
				const isValid = formRegExPassed[area];
				const isInvalid = !isEmpty && !isValid;
				return (
					<CustomInput
						key={area}
						title={authFormData[area].title}
						isInvalid={isInvalid}
						area={area}
						placeholder={authFormData[area].placeholder}
						onChange={handleAuthForm}
						value={value}
						validationMessage={authFormData[area].validationMessage}
					/>
				);
			})}
			{authType === 'signUp' && (
				<CustomInput
					key='confirmPassword'
					title='Confirm Password'
					isInvalid={!isPasswordCorrect && authForm.confirmPassword.length > 0}
					area='confirmPassword'
					placeholder='Re-enter your password'
					onChange={(e) =>
						setAuthForm((prev) => ({
							...prev,
							confirmPassword: e.target.value.trim(),
						}))
					}
					value={authForm.confirmPassword}
					validationMessage='Passwords do not match'
				/>
			)}
			<button
				className='bg-purple-500 text-white rounded-lg py-2 px-4 hover:bg-purple-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500'
				disabled={!isFormValid || (authType === 'signUp' && !isPasswordCorrect)}
				onClick={() => {
					if (authType === 'signIn') {
						handleLogin();
					} else {
						handleSignUp();
					}
				}}
			>
				{authContent[authType].buttonText}
			</button>
			<div className='w-full h-0.5 bg-gray-200' />
			<span className='text-gray-600 text-sm self-center'>
				{authContent[authType].changeTypeText[0]}{' '}
				<button
					className='text-purple-500 hover:text-purple-700 transition-colors'
					onClick={() => setAuthType(authContent[authType].setType)}
				>
					{authContent[authType].changeTypeText[1]}
				</button>
			</span>
		</div>
	);
}
