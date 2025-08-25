import path from 'path';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(process.argv[1]);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const allowedOrigins = [
	'http://localhost:3001',
	'https://admin.socket.io',
	'http://localhost:3000',
];

export default allowedOrigins;
