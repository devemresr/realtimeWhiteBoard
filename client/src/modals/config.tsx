import { AuthContent, AuthContentTypes, AuthFormData } from './types';

export const authContent: Record<AuthContentTypes, AuthContent> = {
	signIn: {
		title: 'Sign In',
		text: 'Welcome back! Please enter your details.',
		areas: ['email', 'password'],
		changeTypeText: ['Dont have an account?', 'Sign up'],
		setType: 'signUp',
		buttonText: 'Login',
	},
	signUp: {
		title: 'Sign Up',
		text: 'Welcome! Enter your details to create a new account.',
		areas: ['name', 'username', 'email', 'password'],
		changeTypeText: ['Already have an account?', 'Sign in'],
		setType: 'signIn',
		buttonText: 'Create',
	},
};
export const authFormData: AuthFormData = {
	name: {
		placeholder: 'Name Surname',
		title: 'Name',
		validationRegex: /^[A-Za-z\s]{3,28}$/,
		validationMessage:
			'Name must be 3-28 characters long and contain only letters and spaces.',
	},
	username: {
		placeholder: 'Username123',
		title: 'Username',
		validationRegex: /^[A-Za-z0-9_]{1,16}$/,
		validationMessage:
			'Username must be 1-16 characters long and contain only letters, numbers, and underscores.',
	},
	email: {
		placeholder: 'email@gmail.com',
		title: 'Email',
		validationRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		validationMessage: 'Please enter a valid email address.',
	},
	password: {
		placeholder: 'Password123*',
		title: 'Password',
		validationRegex: /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
		validationMessage:
			'Password must be at least 8 characters long and contain an uppercase letter, a number, and a special character.',
	},
};
