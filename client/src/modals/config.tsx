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
		areas: ['name', 'surname', 'username', 'email', 'password'],
		changeTypeText: ['Already have an account?', 'Sign in'],
		setType: 'signIn',
		buttonText: 'Create',
	},
};
export const authFormData: AuthFormData = {
	name: {
		placeholder: 'Name',
		title: 'Name',
		validationRegex: /^[A-Za-z\s]{3,28}$/,
		validationMessage:
			'Name must be 3-28 characters long and contain only letters and spaces.',
	},
	surname: {
		placeholder: 'Surname',
		title: 'Surname',
		validationRegex: /^[A-Za-z\s]{2,28}$/,
		validationMessage:
			'Surname must be 2-28 characters and contain only letters.',
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

export const collabButtons = [
	{
		key: 'create',
		label: 'Create room',
		bgHover: 'hover:bg-yellow-500',
		bg: 'bg-yellow-500',
		shapes: [
			{
				cls: 'top-2 -left-2 w-24 h-24 bg-gray-400',
				bg: '!bg-pink-400',
				colorHover: 'group-hover:bg-pink-400',
				shapeHover: 'group-hover:animate-float1',
				animation: 'animate-float1',
			},
			{
				cls: 'top-24 left-0 w-28 h-28 bg-gray-500',
				bg: 'bg-red-500',
				colorHover: 'group-hover:bg-red-500',
				shapeHover: 'group-hover:animate-float2',
				animation: 'animate-float2',
			},
			{
				cls: '-top-4 left-12 w-24 h-24 bg-gray-500',
				bg: '!bg-orange-500',
				colorHover: 'group-hover:bg-orange-500',
				shapeHover: 'group-hover:animate-float2',
				animation: 'animate-float2',
			},
			{
				cls: 'top-16 left-24 w-20 h-20 bg-gray-400',
				bg: '!bg-pink-500',
				colorHover: 'group-hover:bg-pink-500',
				shapeHover: 'group-hover:animate-float3',
				animation: 'animate-float3',
			},
			{
				cls: 'top-32 left-32 w-20 h-20 bg-gray-500',
				bg: '!bg-orange-500',
				colorHover: 'group-hover:bg-orange-500',
				shapeHover: 'group-hover:animate-float1',
				animation: 'animate-float1',
			},
		],
	},
	{
		key: 'join',
		label: 'Join room',
		bgHover: 'hover:bg-cyan-500',
		bg: 'bg-cyan-500',
		shapes: [
			{
				cls: '-top-8 -left-2 w-28 h-28 bg-gray-500',
				bg: '!bg-blue-600',
				colorHover: 'group-hover:bg-blue-600',
				shapeHover: 'group-hover:animate-float2',
				animation: 'animate-float2',
			},
			{
				cls: 'top-24 left-0 w-24 h-24 bg-gray-500',
				bg: '!bg-purple-500',
				colorHover: 'group-hover:bg-purple-500',
				shapeHover: 'group-hover:animate-float1',
				animation: 'animate-float1',
			},
			{
				cls: '-top-8 right-2 w-24 h-24 bg-gray-400',
				bg: '!bg-pink-400',
				colorHover: 'group-hover:bg-pink-400',
				shapeHover: 'group-hover:animate-float1',
				animation: 'animate-float1',
			},
			{
				cls: 'top-12 -right-4 w-20 h-20 bg-gray-500',
				bg: '!bg-blue-600',
				colorHover: 'group-hover:bg-blue-600',
				shapeHover: 'group-hover:animate-float3',
				animation: 'animate-float3',
			},
			{
				cls: 'top-24 -right-2 w-24 h-24 bg-gray-400',
				bg: '!bg-pink-400',
				colorHover: 'group-hover:bg-pink-400',
				shapeHover: 'group-hover:animate-float2',
				animation: 'animate-float2',
			},
		],
	},
];
