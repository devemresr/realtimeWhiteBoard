export type AuthFormKeys =
	| 'name'
	| 'username'
	| 'email'
	| 'password'
	| 'surname';
export type AuthContentTypes = 'signIn' | 'signUp';
export type AuthContent = {
	title: string;
	text: string;
	areas: AuthFormKeys[];
	changeTypeText: [string, string];
	setType: AuthContentTypes;
	buttonText: string;
};
export type AuthFormData = {
	[key in AuthFormKeys]: {
		placeholder: string;
		title: string;
		validationRegex: RegExp;
		validationMessage: string;
	};
};
