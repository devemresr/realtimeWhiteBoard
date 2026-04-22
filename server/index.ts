import express from 'express';
import { createServer } from 'node:http';
import credentials from './config/credantials';
import corsOptions from './config/corsOptions';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import mongoose from 'mongoose';
import helmet from 'helmet';
import { handleSanitization } from './middleware/handleSanitization';
import { bootstrapApplication } from './bootstrapApplication';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(credentials);
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(handleSanitization);
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
	try {
		// Start mongoDB
		if (!process.env.MONGODB_URI) {
			console.error('MONGODB_URI is not defined in environment variables.');
			process.exit(1);
		}
		const mongoUri = process.env.MONGODB_URI;

		await mongoose.connect(mongoUri);
		console.log('MongoDB connected');

		console.log('Bootstrapping application...');
		await bootstrapApplication(httpServer);

		await new Promise((resolve) => {
			httpServer.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
				console.log('connected at port: ', PORT);
				resolve(void 0);
			});
		});

		console.log('Server started successfully');
	} catch (error) {
		console.log('error during server startup:', error);
		await new Promise((resolve) => setTimeout(resolve, 1000));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	try {
		httpServer.close();
		console.log('Graceful shutdown complete');
	} catch (error) {
		console.error('Error during shutdown:', error);
	} finally {
		process.exit(0);
	}
});

startServer().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
export default app;
