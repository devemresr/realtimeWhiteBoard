import { Server } from 'node:http';
import request from 'supertest';

export const TEST_USER = {
	email: 'test@test.com',
	password: 'Password123!',
	name: 'name',
	surname: 'surname',
};

/** Register a user and return the access token + raw cookie header for reuse */
export async function registerAndGetTokens(app: Server) {
	const res = await request(app).post('/api/auth/register').send(TEST_USER);

	const accessToken: string = res.body.accessToken;
	// supertest gives back set-cookie as an array of raw strings — grab the jwt one
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
