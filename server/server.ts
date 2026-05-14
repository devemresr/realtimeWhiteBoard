import mongoose from 'mongoose';
import { bootstrapApplication } from './bootstrapApplication';
import authRoutes from './routes/authRoutes';
import app from './app';
import { Server } from 'node:http';
import { RedisFactory } from './services/redis/RedisFactory';
import { RedisClients } from '@shared/constants/socketIoConstants';
import { Request, Response } from 'express';
import { SocketManager } from 'controllers/socket/socketManager';

const PORT = process.env.PORT || 3001;
let shuttingDown = false;

export async function startServer(httpServer: Server): Promise<Server> {
	console.log('starting server');

	// Start mongoDB
	if (!process.env.MONGODB_URI) {
		throw new Error('MONGODB_URI is not defined in environment variables.');
	}
	const mongoUri = process.env.MONGODB_URI;

	await mongoose.connect(mongoUri);
	console.log('MongoDB connected');

	console.log('Bootstrapping application...');
	const { tokenBlacklist } = await bootstrapApplication(httpServer);
	app.use('/api/auth', authRoutes(tokenBlacklist));
	app.use('/ping', (req: Request, res: Response) => {
		return res.status(200).json({ success: true, msg: 'pong' });
	});

	await new Promise((resolve) => {
		httpServer.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
			console.log('connected at port: ', PORT);
			resolve(void 0);
		});
	});

	console.log('Server started successfully');
	return httpServer;
}

export async function gracefulShutdown(server?: Server) {
	if (shuttingDown) {
		console.log('Shutdown already in progress');
		return;
	}

	shuttingDown = true;
	const errors: unknown[] = [];
	console.log('gracefulShutdown started');

	if (server) {
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		}).catch((err) => errors.push(err));
	}

	await SocketManager.getInstance()
		.quitSubClient()
		.catch((err) => errors.push(err));

	await Promise.all([
		RedisFactory.getInstance(RedisClients.MAIN).getRawClient().quit(),
		RedisFactory.getInstance(RedisClients.ADAPTER).getRawClient().quit(),
	]).catch((err) => errors.push(err));

	if (mongoose.connection.readyState === 1) {
		await mongoose.disconnect().catch((err) => errors.push(err));
	}

	if (errors.length > 0) {
		console.error('Shutdown completed with errors:', errors);
		throw new AggregateError(errors, 'Graceful shutdown encountered errors');
	}
}
