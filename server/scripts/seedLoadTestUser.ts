import axios from 'axios';
import fs from 'fs';
const NUM_ROOMS = parseInt(process.env.NUM_ROOMS as string) || 300;

async function seed() {
	// Login
	const BASE_URL = process.env.API_URL ?? 'http://localhost:3001';

	try {
		const res = await axios.post(`${BASE_URL}/auth/register`, {
			email: 'test@',
			password: 'test',
			name: 'test',
			surname: 'test',
		});
		console.log('res for register : ', res.data);
	} catch (e: any) {
		// already exists, continue
		console.log('status:', e.response?.status);
		console.log('response body:', e.response?.data);
	}

	let accessToken, jwtCookie;
	try {
		const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
			email: 'loadtest@test.com',
			password: 'testpassword',
		});
		accessToken = loginRes.data.accessToken;
		jwtCookie =
			loginRes.headers['set-cookie']
				?.find((c) => c.startsWith('jwt='))
				?.split(';')[0] ?? '';
	} catch (error: any) {
		console.log('status:', error.response?.status);
		console.log('response body:', error.response?.data);
	}

	// Create rooms
	console.log('creating rooms');

	const roomIds: string[] = [];
	for (let i = 0; i < NUM_ROOMS; i++) {
		const roomRes = await axios.post(
			'http://localhost:3001/room/create',
			{},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Cookie: jwtCookie as string,
				},
			},
		);
		roomIds.push(roomRes.data.roomId);
	}

	// Write CSV
	const csv = 'roomId\n' + roomIds.join('\n');
	fs.writeFileSync('client/tests/artillery/rooms.csv', csv);
	console.log(`Seeded ${NUM_ROOMS} rooms => rooms.csv`);
}

seed().catch(console.error);
