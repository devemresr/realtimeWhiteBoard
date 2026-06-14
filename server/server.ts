import mongoose from 'mongoose';
import { bootstrapApplication } from './bootstrapApplication';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import app from './app';
import { Server } from 'node:http';
import { RedisFactory } from './services/redis/RedisFactory';
import { RedisClients } from 'controllers/constants/cacheKeys.constant';
import { Request, Response } from 'express';
import { AdapterManager } from 'controllers/socket/adapterManager';
import { API_BASE_PATHS } from 'constants/routes.constant';
import { register } from 'prom-client';

const PORT = process.env.PORT || 3001;
let shuttingDown = false;

export async function startServer(httpServer: Server): Promise<Server> {
	console.log('starting server');
	console.log('process.env.MONGODB_URI', process.env.MONGODB_URI);
	app.use('/health', (req: Request, res: Response) => {
		res.status(200).json({ status: 'ok' });
	});

	// Start mongoDB
	if (!process.env.MONGODB_URI) {
		throw new Error('MONGODB_URI is not defined in environment variables.');
	}
	const mongoUri = process.env.MONGODB_URI;

	await mongoose.connect(mongoUri);
	console.log('MongoDB connected');

	console.log('Bootstrapping application...');
	const { tokenBlacklist } = await bootstrapApplication(httpServer);
	app.use(API_BASE_PATHS.AUTH, authRoutes(tokenBlacklist));
	app.use(API_BASE_PATHS.ROOM, roomRoutes(tokenBlacklist));

	app.get('/metrics', async (req, res) => {
		res.set('Content-Type', register.contentType);
		res.send(await register.metrics());
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
	console.log('gracefulShutdown started', new Error().stack);

	if (server) {
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		}).catch((err) => errors.push(err));
	}

	// In gracefulShutdown
	const adapterManager = AdapterManager.getInstance(); // access static directly, no throw
	if (adapterManager) {
		await adapterManager.quitSubClient().catch((err) => errors.push(err));
	}

	const isProd = process.env.NODE_ENV === 'production';

	await Promise.all([
		RedisFactory.getInstance(RedisClients.MAIN)
			.getRawClient()
			[isProd ? 'quit' : 'disconnect'](), //quit waits till pending commands are done disconnect does not
		RedisFactory.getInstance(RedisClients.ADAPTER)
			.getRawClient()
			[isProd ? 'quit' : 'disconnect'](),
	]).catch((err) => errors.push(err));

	if (mongoose.connection.readyState === 1) {
		await mongoose.disconnect().catch((err) => errors.push(err));
	}

	if (errors.length > 0) {
		console.error('Shutdown completed with errors:', errors);
		throw new AggregateError(errors, 'Graceful shutdown encountered errors');
	}
}
