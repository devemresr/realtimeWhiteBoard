import express from 'express';
import { createServer } from 'node:http';
import credentials from './config/credantials';
import corsOptions from './config/corsOptions';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import * as dotenv from 'dotenv';
const __dirname = path.dirname(process.argv[1]);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
import authRoutes from './routes/authRoutes';
import mongoose from 'mongoose';
import helmet from 'helmet';
import { handleSanitization } from './middleware/handleSanitization';
import { bootstrapApplication } from './bootstrapApplication';

const PORT = process.argv[2] || 3000;
const app = express();
const httpServer = createServer(app);

app.use(credentials);
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(handleSanitization);
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use('/auth', authRoutes);

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
		await bootstrapApplication(httpServer, PORT.toString());

		await new Promise((resolve) => {
			httpServer.listen(parseInt(PORT.toString()), () => {
				console.log('connected at port: ', PORT);
				resolve(void 0);
			});
		});

		console.log('Server strated successfully');
	} catch (error) {
		console.log('error during server startup:', error);
		await new Promise((resolve) => setTimeout(resolve, 1000));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	try {
		// todo add graceful shutdown
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
