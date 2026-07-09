import Redis, { RedisOptions } from 'ioredis';
import logger from 'utils/logger';
import { EventEmitter } from 'events';
import { redisCmdDuration } from '../../metrics';

export class RedisClient extends EventEmitter {
	private client: Redis;
	private config: RedisOptions;
	private isConnected = false;
	private clientName: string;

	private log;

	private setupEventHandlers(): void {
		// persistent listener stays attached through retries
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

	private constructor(
		config?: Omit<RedisOptions, 'lazyConnect'>,
		clientName?: string,
	) {
		super();
		this.clientName = clientName ?? `redis-${Date.now()}`;
		this.log = logger.child({ redisClient: this.clientName });

		this.config = {
			host: process.env.REDIS_HOST || 'localhost',
			port: parseInt(process.env.REDIS_PORT || '6379'),
			maxRetriesPerRequest: 3,
			connectTimeout: 10000,
			keepAlive: 30000,
			enableReadyCheck: true,
			retryStrategy: (times) => {
				if (times > 10) {
					this.log.error('Connection failed after 10 retry attempts giving up');
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
		};

		this.client = new Redis(this.config);
		this.client.on('command', (command) => {
			const end = redisCmdDuration.startTimer({ command: command.name });
			command.promise.finally(() => end());
		});
		this.setupEventHandlers();
	}

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

	getRawClient(): Redis {
		if (!this.isReady()) {
			throw new Error(
				`[${this.clientName}] Client not ready call connect() first`,
			);
		}
		return process.env.NODE_ENV === 'test' // only test env doesn't need prometheus
			? this.client
			: new Proxy(this.client, {
					get: (target, prop) => {
						const original = target[prop as keyof Redis];
						if (typeof original !== 'function') return original;

						const skipCommands = new Set([
							'on',
							'once',
							'off',
							'emit',
							'duplicate',
							'connect',
							'disconnect',
						]);

						// Return uninstrumented function immediately for non-Redis methods
						if (skipCommands.has(String(prop))) {
							return (original as Function).bind(target);
						}

						if (String(prop) === 'pipeline') {
							return (...args: any[]) => {
								const pipeline = (original as Function).apply(target, args);
								const originalExec = pipeline.exec.bind(pipeline);
								pipeline.exec = (...execArgs: any[]) => {
									const end = redisCmdDuration.startTimer({
										command: 'pipeline',
										client: this.clientName,
									});
									let ended = false;
									const safeEnd = () => {
										if (!ended) {
											ended = true;
											end();
										}
									};
									return originalExec(...execArgs).finally(safeEnd);
								};
								return pipeline;
							};
						}

						return (...args: any[]) => {
							const end = redisCmdDuration.startTimer({
								command: String(prop),
								client: this.clientName,
							});
							let ended = false;
							const safeEnd = () => {
								if (!ended) {
									ended = true;
									end();
								}
							};
							const result = (original as Function).apply(target, args);
							if (result instanceof Promise) {
								return result.finally(safeEnd);
							}
							safeEnd();
							return result;
						};
					},
				});
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
