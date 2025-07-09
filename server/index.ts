import express from 'express';
import { createServer } from 'node:http';
import credentials from './config/credantials';
import corsOptions from './config/corsOptions';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';
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
		origin: 'http://localhost:3001',
		methods: ['GET', 'POST'], //todo look if you need more methods allowed
		allowedHeaders: ['Content-Type'],
		credentials: true,
	},
});

io.on('connection', (socket) => {
	console.log('New client connected:', socket.id);

	socket.on('chat_message', (message) => {
		console.log('Message received:', message);
		io.emit('new_message', message);
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected:', socket.id);
	});
});

const PORT = 3000;
httpServer.listen(PORT, () => {
	console.log('connected at port: ', PORT);
});

export default app;
