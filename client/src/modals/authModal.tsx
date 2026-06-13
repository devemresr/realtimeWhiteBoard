import { useState } from 'react';
import { AuthContentTypes } from './types';
import { authContent, authFormData } from './config';
import CustomInput from 'src/components/customInput';
import UploadAvatar from 'src/components/uploadAvatar';
import { useUserStore } from 'src/store/UserStore';

export default function AuthModal() {
	const userStore = useUserStore();
	const [authType, setAuthType] = useState<AuthContentTypes>('signIn');
	const [authForm, setAuthForm] = useState({
		avatar:
			'https://cdn.vectorstock.com/i/500p/71/90/blank-avatar-placeholder-icon-vector-30257190.jpg',
		name: '',
		username: '',
		email: '',
		password: '',
	});
	const [formRegExPassed, setFormRegExPassed] = useState({
		name: false,
		username: false,
		email: false,
		password: false,
	});
	const isFormValid = authContent[authType].areas.every(
		(area) => formRegExPassed[area],
	);
	const isPasswordCorrect = true; // todo handle password check
	const handleLogin = () => {
		userStore.setUser({
			id: '', //todo get user info from backend
			name: '',
			username: '',
			email: authForm.email,
			avatar: '',
		});
	};
	const handleSignUp = () => {
		if (isPasswordCorrect) {
			userStore.setUser({
				id: 'user-id',
				name: authForm.name,
				username: authForm.username,
				email: authForm.email,
				avatar: authForm.avatar,
			});
		} // todo backend integration for sign up
	};
	const handleAuthForm = (e) => {
		setAuthForm((prev) => ({
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

			{authContent[authType].areas.map((area) => {
				const value = authForm[area];
				const isEmpty = !value || value.length === 0;
				const isValid = formRegExPassed[area];
				const isInvalid = !isEmpty && !isValid;
				return (
					<CustomInput
						title={authFormData[area].title}
						isInvalid={isInvalid}
						area={area}
						placeholder={authFormData[area].placeholder}
						onChange={(e) => handleAuthForm(e)}
						value={authForm[area]}
						validationMessage={authFormData[area].validationMessage}
					/>
				);
			})}
			<button
				className='bg-purple-500 text-white rounded-lg py-2 px-4 hover:bg-purple-600 transition-colors  disabled:bg-gray-300 disabled:text-gray-500'
				disabled={!isFormValid}
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
