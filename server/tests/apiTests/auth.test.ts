jest.mock('../../services/auth/constants/jwtConstants', () => ({
	JWT_EXPIRE_TIMES: {
		ACCESSTOKEN: '500ms',
		REFRESHTOKEN: '2s',
	},
}));
import {
	registerAndGetTokens,
	TEST_USER,
	wait,
} from 'tests/utils/authTestHelpers';
import { setupIntegrationTest } from 'tests/utils/setupIntegrationTest';
import request from 'supertest';
import { AUTH_API } from 'constants/routes.constant';
const { getServer } = setupIntegrationTest();

describe('POST /auth/register', () => {
	it('registers a new user and returns an access token + refresh cookie', async () => {
		const { res, jwtCookie } = await registerAndGetTokens(getServer());
		expect(res.status).toBe(200);
		expect(res.body.accessToken).toBeDefined();
		expect(jwtCookie).toMatch(/^jwt=/);

		// HttpOnly so JS can't read it - verify the flag is set
		expect(jwtCookie).toMatch(/HttpOnly/i);
	});

	it('rejects duplicate email with 409', async () => {
		await registerAndGetTokens(getServer()); // first registration
		const res = await request(getServer())
			.post(AUTH_API.REGISTER)
			.send(TEST_USER); // same email again
		expect(res.status).toBe(409);
	});
});

describe('POST /auth/login', () => {
	beforeEach(async () => {
		await registerAndGetTokens(getServer()); // seed a user to log in with
	});

	it('logs in with correct credentials', async () => {
		await registerAndGetTokens(getServer()); // seed a user to log in with
		const res = await request(getServer()).post(AUTH_API.LOGIN).send(TEST_USER);
		expect(res.status).toBe(200);
		expect(res.body.accessToken).toBeDefined();
		const rawCookies: string[] | never | string =
			res.headers['set-cookie'] ?? [];
		const cookies: string[] = Array.isArray(rawCookies)
			? rawCookies
			: rawCookies
				? [rawCookies]
				: [];
		expect(cookies.some((c: string) => c.startsWith('jwt='))).toBe(true);
	});

	it('rejects wrong password with 401', async () => {
		const res = await request(getServer())
			.post(AUTH_API.LOGIN)
			.send({ email: TEST_USER.email, password: 'wrongpassword' });
		expect(res.status).toBe(401);
	});

	it('rejects non-existent user with 404', async () => {
		const res = await request(getServer())
			.post(AUTH_API.LOGIN)
			.send({ email: 'ghost@test.com', password: 'whatever' });
		expect(res.status).toBe(404);
	});
});

describe('POST /auth/test - token verification + refresh flow', () => {
	it('valid access token - request passes through', async () => {
		const { accessToken, jwtCookie } = await registerAndGetTokens(getServer());
		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', `Bearer ${accessToken}`)
			.set('Cookie', jwtCookie);

		expect(res.status).toBe(200);
	});

	it('expired access + valid refresh - new access token issued, request continues', async () => {
		const { accessToken, jwtCookie } = await registerAndGetTokens(getServer());

		// Wait for access token to expire (mocked to 500ms)
		await wait(600);

		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', `Bearer ${accessToken}`)
			.set('Cookie', jwtCookie); // refresh token still valid (mocked to 2s)

		expect(res.status).toBe(200);
		// Middleware attaches the new token - adjust this to however your

		// protectedd handler forwards it (response header, body, etc.)
		expect(res.body.accessToken).toBeDefined();
		expect(res.body.accessToken !== accessToken).toBeDefined();
	});

	it('expired access + expired refresh - 401, must re-login', async () => {
		const { accessToken, jwtCookie } = await registerAndGetTokens(getServer());

		// Wait for BOTH tokens to expire (refresh mocked to 2s)
		await wait(2500);

		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', `Bearer ${accessToken}`)
			.set('Cookie', jwtCookie);

		expect(res.status).toBe(401);
		expect(res.body.error).toMatch(/Refresh token expired/i);
	});

	it('expired access + no refresh cookie - 401', async () => {
		const { accessToken } = await registerAndGetTokens(getServer());

		await wait(1500);

		// No Cookie header at all - createVerifyJWT short-circuits immediately
		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', `Bearer ${accessToken}`);
		// deliberately no .set('Cookie', ...)

		expect(res.status).toBe(401);
		expect(res.body.error).toMatch(/No refresh token provided/i);
	});

	it('no token at all - 401', async () => {
		// No Authorization header, no Cookie
		const res = await request(getServer()).post('/auth/test');

		expect(res.status).toBe(401);
	});

	it('malformed / tampered access token with valid refresh token - 200', async () => {
		const { jwtCookie } = await registerAndGetTokens(getServer());

		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', 'Bearer this.is.malformedToken')
			.set('Cookie', jwtCookie);

		expect(res.status).toBe(200);
		expect(res.body.accessToken).toBeDefined();
	});

	it('malformed access token with no refresh token - 401', async () => {
		const res = await request(getServer())
			.post('/auth/test')
			.set('Authorization', 'Bearer this.is.malformedToken');
		// no cookie at all

		expect(res.status).toBe(401);
		expect(res.body.error).toMatch(/No refresh token provided/i);
	});
});
