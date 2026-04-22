import dotenv from 'dotenv';
dotenv.config({
	path: process.env.CI ? '.env.production' : '.env.development',
});
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	use: {
		baseURL: process.env.BASE_URL,
		trace: 'on-first-retry',
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
	],

	webServer: {
		command: 'npm run dev',
		url: process.env.BASE_URL, // this url is polled until it responds
		reuseExistingServer: !process.env.CI, // locally reuse if already running, in CI always start fresh
		timeout: 120_000, // wait up to 2 min for the server to start
	},
});
