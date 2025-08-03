import express from 'express';
import { instrument } from '@socket.io/admin-ui';
import { createServer } from 'node:http';
import credentials from './config/credantials';
import corsOptions from './config/corsOptions';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';
// import StrokePackageGapDetector from './controllers/gapDetection';
const __dirname = path.dirname(process.argv[1]);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const httpServer = createServer(app);

app.use(credentials);
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const io = new Server(httpServer, {
	cors: {
		origin: [
			`${process.env.DEV_CLIENT_ORIGIN}`,
			'https://admin.socket.io',
			'http://localhost:3000',
		],
		methods: ['GET', 'POST'], //todo look if you need more methods allowed
		allowedHeaders: ['Content-Type'],
		credentials: true,
	},
});

// auth: { type: "basic", username: "admin", password: ""}); the server url is for the backend
// todo add it before prod
instrument(io, {
	auth: false,
	mode: 'development',
});
console.log('io.sockets.sockets', io.sockets.sockets);

function terminateAllSockets() {
	io.sockets.sockets.forEach((socket) => {
		socket.disconnect(true);
	});
}

io.on('connection', (socket) => {
	console.log('New client connected:', socket.id);
	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
	});
	socket.on('drawing-packet', (test, callback) => {
		console.log('test', test);
		callback({ status: 'received', timestamp: Date.now() });
		socket.broadcast.emit('recieved-data', test);
	});
	socket.on('ping', (callback) => {
		callback();
	});
});

const PORT = 3000;
httpServer.listen(PORT, () => {
	console.log('connected at port: ', PORT);
});

export default app;
