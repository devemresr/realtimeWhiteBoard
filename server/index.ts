process.once('unhandledRejection', async (reason) => {
	console.error('Unhandled rejection:', reason);
	console.trace('Unhandled rejection triggered');
	await gracefulShutdown(httpServer);
	process.exitCode = 0;
});

process.once('uncaughtException', async (err) => {
	console.error('Uncaught Exception:', err);
	console.trace('uncaughtException triggered');

	await gracefulShutdown(httpServer);
	process.exitCode = 0;
});

// Graceful shutdown handler:
// On SIGINT/SIGTERM, stop accepting new work,
// and cleanly close all resources (DB connections, queues, sockets, etc.)
//
// TODO: Centralize teardown logic from services and invoke it here.
process.once('SIGINT', async () => {
	try {
		console.log('SIGINT triggered');
		await gracefulShutdown(httpServer);
	} catch (error) {
		console.error('Error during shutdown:', error);
	} finally {
		process.exitCode = 0;
	}
});

import { createServer } from 'http';
import { gracefulShutdown, startServer } from './server';
import app from 'app';

const httpServer = createServer(app);
(async () => {
	try {
		await startServer(httpServer);
	} catch (error) {
		console.error('error at startServer:', error);
		process.exitCode = 0;
	}
})();
