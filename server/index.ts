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

const PORT = process.argv[2] || 3000;
const app = express();
const httpServer = createServer(app);

app.use(credentials);
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
	console.log('Received request at port', PORT);
	return res.status(200).json({
		server_port: PORT,
	});
});

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

httpServer.listen(PORT, () => {
	console.log('connected at port: ', PORT);
});

export default app;
