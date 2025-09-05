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
import allowedOrigins from './config/allowedOrigins';
import SocketController from './controllers/socketController';
const __dirname = path.dirname(process.argv[1]);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
import authRoutes from './routes/authRoutes';
import mongoose from 'mongoose';
import helmet from 'helmet';
import sanitize from 'mongo-sanitize';
import sanitizeQueryData from './middleware/sanitizeQueryData';

const PORT = process.argv[2] || 3000;
const app = express();
const httpServer = createServer(app);

app.use(credentials);
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
	if (req.body && typeof req.body === 'object') {
		console.log('req.body before sanitization', req.body);
		req.body = sanitize(req.body);
		console.log('req.body after sanitization', req.body);
	}
	if (req.query && typeof req.query === 'object') {
		console.log('req.query', req.query);
		const success = sanitizeQueryData(req, res); // Modifies existing object instead of reassigning we should be able to do this in the mongo-sanitize library but because of a known issue we cant
		if (!success) {
			return res.status(400).json({ error: 'Invalid request format' });
		}
		console.log('req.query', req.query);
	}

	if (req.params && typeof req.params === 'object') {
		console.log('req.params before sanitization', req.params);
		req.params = sanitize(req.params);
		console.log('req.params after sanitization', req.params);
	}
	next();
});
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use('/auth', authRoutes);

const io = new Server(httpServer, {
	cors: {
		origin: [...allowedOrigins],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type'],
		credentials: true,
	},
	transports: ['websocket', 'polling'],
	allowEIO3: true,
});

const socketController = new SocketController(io);
socketController
	.initialize()
	.then(() => {
		io.on(
			'connection',
			socketController.handleConnection.bind(socketController)
		);
		console.log('Socket.IO server ready for connections');
	})
	.catch((error) => {
		console.error('Failed to initialize socket controller:', error);
	});
// todo add auth
instrument(io, {
	auth: false,
	mode: 'development',
});

if (!process.env.MONGODB_URI) {
	throw new Error('process.env.MONGODB_URI is not set');
}
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('connected to db');
		httpServer.listen(PORT, () => {
			console.log('connected at port: ', PORT);
		});
	})
	.catch((error) => {
		console.log('error', error);
		console.log('didnt connect');
	});

export default app;
