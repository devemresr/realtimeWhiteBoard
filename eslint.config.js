import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: [
			'server/**/*.{ts,js}',
			'shared/**/*.{ts,js}',
			'client/**/*.{ts,js,jsx}',
		],
		rules: {},
	},
	{
		ignores: [
			'dist/',
			'node_modules/',
			'server/node_modules/',
			'client/node_modules/',
		],
	},
);
