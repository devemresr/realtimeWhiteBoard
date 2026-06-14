import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
	globalIgnores([
		'**/dist/**',
		'**/node_modules/**',
		'server/wip/**',
		'client/wip/**',
		'client/mocks/**',
	]),
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: [
			'server/**/*.{ts,js}',
			'shared/**/*.{ts,js}',
			'client/**/*.{ts,tsx,js,jsx}',
		],
		plugins: {
			'unused-imports': unusedImports,
		},
		rules: {
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
);
