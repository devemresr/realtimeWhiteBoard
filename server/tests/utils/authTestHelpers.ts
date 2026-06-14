import { AUTH_API } from 'constants/routes.constant';
import { Server } from 'node:http';
import request from 'supertest';

export const TEST_USER = {
	email: 'test@test.com',
	password: 'Password123!',
	name: 'name',
	surname: 'surname',
};

export const createTestUser = (overrides?: Partial<typeof TEST_USER>) => {
	const suffix = Math.random().toString(36).slice(2, 8); // e.g. 'k3x9mz'
	return {
		email: `test_${suffix}@test.com`,
		password: 'Password123!',
		name: `name_${suffix}`,
		surname: `surname_${suffix}`,
		...overrides,
	};
};

/** Register a user and return the access token + raw cookie header for reuse */
export async function registerAndGetTokens(app: Server, user = TEST_USER) {
	const res = await request(app).post(AUTH_API.REGISTER).send(user);

	const accessToken: string = res.body.accessToken;
	// supertest gives back set-cookie as an array of raw strings - grab the jwt one
	const rawCookies = res.headers['set-cookie'];

	const cookies: string[] = Array.isArray(rawCookies)
		? rawCookies
		: rawCookies
			? [rawCookies]
			: [];

	const jwtCookie = cookies.find((c) => c.startsWith('jwt=')) ?? '';

	return { accessToken, jwtCookie, res };
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
