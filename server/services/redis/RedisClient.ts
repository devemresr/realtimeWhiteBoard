import Redis, { RedisOptions } from 'ioredis';
import logger from '@shared/util/logger';
import { EventEmitter } from 'events';

export class RedisClient extends EventEmitter {
	private client: Redis;
	private config: RedisOptions;
	private isConnected = false;
	private clientName: string;
	private connectionPromise: Promise<void> | null = null;

	private log;

	private setupEventHandlers(): void {
		// persistent listener — stays attached through retries
		this.client?.on('error', (err) => {
			this.isConnected = false;
			console.error(`[${this.clientName}] error:`, err);
		});

		this.client?.on('ready', () => {
			this.isConnected = true;
			this.log.info('Redis connection ready');
		});

		this.client?.on('reconnecting', () => {
			this.log.warn('Reconnecting...');
		});

		this.client?.on('end', () => {
			this.isConnected = false;
			console.warn(
				`[${this.clientName}] connection ended, status:`,
				this.client.status,
			);
		});
	}

	private constructor(config?: RedisOptions, clientName?: string) {
		super();
		this.clientName = clientName ?? `redis-${Date.now()}`;
		this.log = logger.child({ redisClient: this.clientName });

		this.config = {
			host: process.env.REDIS_HOST || 'localhost',
			port: parseInt(process.env.REDIS_PORT || '6379'),
			// maxRetriesPerRequest: process.env.NODE_ENV === 'production' ? 3 : null,
			maxRetriesPerRequest: 3,
			connectTimeout: 10000,
			keepAlive: 30000,
			enableReadyCheck: true,
			retryStrategy: (times) => {
				if (times > 10) {
					this.log.error(
						'Connection failed after 10 retry attempts — giving up',
					);
					return null;
				}
				const delay = Math.min(times * 50, 500);
				this.log.warn(
					{ attempt: times, delayMs: delay },
					'Retrying connection',
				);
				return delay;
			},
			...config,
			// ...{ lazyConnect: true },
		};

		this.client = new Redis(this.config);
		this.setupEventHandlers();
	}

	// static async create(config?: RedisOptions, clientName?: string) {
	// 	const instance = new RedisClient(config, clientName);
	// 	// await instance.connect();
	// 	return instance;
	// }
	static async create(config?: RedisOptions, clientName?: string) {
		const instance = new RedisClient(config, clientName);

		// Wait for the automatic connection to be ready
		return new Promise<RedisClient>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Redis connection timeout for ${clientName}`));
			}, 10000);

			instance.client.once('ready', () => {
				clearTimeout(timeout);
				instance.isConnected = true;
				resolve(instance);
			});

			instance.client.once('error', (err) => {
				clearTimeout(timeout);
				reject(err);
			});
		});
	}

	// async connect(): Promise<void> {
	// 	if (this.isConnected) return;
	// 	if (this.connectionPromise) return this.connectionPromise;

	// 	this.connectionPromise = new Promise<void>((resolve, reject) => {
	// 		// this once() is only for the initial connect attempt result
	// 		this.client.once('ready', () => {
	// 			this.connectionPromise = null;
	// 			this.isConnected = true;
	// 			resolve();
	// 		});

	// 		this.client.once('error', (err) => {
	// 			this.connectionPromise = null;
	// 			reject(err);
	// 		});

	// 		this.client.connect().catch((err) => {
	// 			this.connectionPromise = null;
	// 			reject(err);
	// 		});
	// 	});

	// 	return this.connectionPromise;
	// }

	getRawClient(): Redis {
		if (!this.isReady()) {
			throw new Error(
				`[${this.clientName}] Client not ready — call connect() first`,
			);
		}
		return this.client;
	}

	isReady(): boolean {
		return this.isConnected && this.client.status === 'ready';
	}

	async ping(): Promise<string> {
		if (!this.isConnected)
			throw new Error(`[${this.clientName}] Not connected`);
		return this.client.ping();
	}

	async healthCheck() {
		try {
			const ping = await this.ping();
			return { connected: this.isConnected, status: this.client.status, ping };
		} catch (error) {
			return {
				connected: false,
				status: this.client.status,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async disconnect(): Promise<void> {
		if (this.client.status === 'end') return;

		this.isConnected = false;

		try {
			await this.client.quit();
		} catch (err) {
			console.error(`[${this.clientName}] quit failed`, err);
			this.client.disconnect();
		}
	}

	getConfig(): RedisOptions {
		return { ...this.config };
	}
}
