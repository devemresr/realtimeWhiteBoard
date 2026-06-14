const { createDefaultPreset } = require('ts-jest');

const presetConfig = createDefaultPreset({
	tsconfig: './server/tsconfig.json',
});

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	...presetConfig,
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/server/tests/utils/setupEnv.ts'],
	testTimeout: 100000,
	roots: ['./server/tests'],
	moduleNameMapper: {
		'^@shared/(.*)$': '<rootDir>/shared/$1',
		'^@/types$': '<rootDir>/shared/types',
		'^@/(.*)$': '<rootDir>/server/$1',
		'^/(.*)$': '<rootDir>/server/$1',
		'^config/(.*)$': '<rootDir>/server/config/$1',
		'^constants/(.*)$': '<rootDir>/server/constants/$1',
		'^controllers/(.*)$': '<rootDir>/server/controllers/$1',
		'^guards/(.*)$': '<rootDir>/server/guards/$1',
		'^handlers/(.*)$': '<rootDir>/server/handlers/$1',
		'^middleware/(.*)$': '<rootDir>/server/middleware/$1',
		'^models/(.*)$': '<rootDir>/server/models/$1',
		'^routes/(.*)$': '<rootDir>/server/routes/$1',
		'^schemas/(.*)$': '<rootDir>/server/schemas/$1',
		'^scripts/(.*)$': '<rootDir>/server/scripts/$1',
		'^services/(.*)$': '<rootDir>/server/services/$1',
		'^tests/(.*)$': '<rootDir>/server/tests/$1',
		'^utils/(.*)$': '<rootDir>/server/utils/$1',
		'^wip/(.*)$': '<rootDir>/server/wip/$1',
	},
};
