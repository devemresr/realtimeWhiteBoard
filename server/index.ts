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
import StrokePackageGapDetector from './controllers/gapDetection';
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
	socket.on('drawing-packet', (test) => {
		console.log('test', test);

		const result = detector.addPackage(test);
		if (result) {
			console.log('Gap detection result:', result);
		}
		socket.broadcast.emit('recieved-data', test);
	});
});

// Example usage:
const detector = new StrokePackageGapDetector();

// Simulate receiving packages (some out of order, some missing)
const samplePackages = [
	{
		strokeId: '1753702961149di8nt213p',
		packageSequenceNumber: 3,
		strokes: [
			{ x: 856, y: 684, timestamp: 1753702961148 },
			{ x: 855, y: 684, timestamp: 1753702961166 },
			{ x: 854, y: 684, timestamp: 1753702961197 },
			{ x: 847, y: 688, timestamp: 1753702961214 },
			{ x: 829, y: 699, timestamp: 1753702961231 },
			{ x: 802, y: 712, timestamp: 1753702961248 },
			{ x: 774, y: 719, timestamp: 1753702961265 },
			{ x: 747, y: 722, timestamp: 1753702961281 },
			{ x: 725, y: 722, timestamp: 1753702961298 },
			{ x: 706, y: 722, timestamp: 1753702961317 },
		],
	},
	{
		strokeId: '1753702961149di8nt213p',
		packageSequenceNumber: 5,
		strokes: [
			{ x: 856, y: 684, timestamp: 1753702961148 },
			{ x: 855, y: 684, timestamp: 1753702961166 },
			{ x: 854, y: 684, timestamp: 1753702961197 },
			{ x: 847, y: 688, timestamp: 1753702961214 },
			{ x: 829, y: 699, timestamp: 1753702961231 },
			{ x: 802, y: 712, timestamp: 1753702961248 },
			{ x: 774, y: 719, timestamp: 1753702961265 },
			{ x: 747, y: 722, timestamp: 1753702961281 },
			{ x: 725, y: 722, timestamp: 1753702961298 },
			{ x: 706, y: 722, timestamp: 1753702961317 },
		],
	},
	{
		strokeId: '1753702961149di8nt213p',
		packageSequenceNumber: 6,
		isLastPacket: true,
		strokeSequenceNumber: 4,
		strokes: [
			{ x: 856, y: 684, timestamp: 1753702961148 },
			{ x: 855, y: 684, timestamp: 1753702961166 },
			{ x: 854, y: 684, timestamp: 1753702961197 },
			{ x: 847, y: 688, timestamp: 1753702961214 },
			{ x: 829, y: 699, timestamp: 1753702961231 },
			{ x: 802, y: 712, timestamp: 1753702961248 },
			{ x: 774, y: 719, timestamp: 1753702961265 },
			{ x: 747, y: 722, timestamp: 1753702961281 },
			{ x: 725, y: 722, timestamp: 1753702961298 },
			{ x: 706, y: 722, timestamp: 1753702961317 },
		],
	},
];
// samplePackages.forEach((pkg) => {
// 	const result = detector.addPackage(pkg);
// 	if (result) {
// 		console.log('Gap detection result:', result);
// 	}
// });

const PORT = 3000;
httpServer.listen(PORT, () => {
	console.log('connected at port: ', PORT);
});

export default app;
