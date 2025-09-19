import Redis from 'ioredis';
import { parseRedisFields } from '../utils/parseRedisField';

interface RedisConfig {
	host?: string;
	port?: number;
	password?: string;
	retryDelayOnFailover?: number;
	enableReadyCheck?: boolean;
	maxRetriesPerRequest?: number;
	[key: string]: any;
}

interface StreamOptions {
	maxLen?: number;
	approximate?: boolean;
}

type MessageHandler = (
	data: any,
	messageId: string,
	streamName: string
) => Promise<void>;

export interface RedisMessage {
	[key: string]: any;
}
interface RedisStreamMessage {
	messageId: string;
	message: Record<string, string>;
}

interface StreamReadResult {
	streamName: string;
	messages: RedisStreamMessage[];
}

interface ConsumerOptions {
	count?: number;
	blockTime?: number;
	processingTimeout?: number;
}

interface MessageData {
	[key: string]: string | number | boolean;
}

interface StreamMessage {
	id: string;
	data: MessageData;
}

class RedisStreamManager {
	private redis: Redis | null = null;
	private isConnected: boolean = false;
	private streamName: string | null = null;
	private consumerName: string;

	constructor() {
		this.consumerName = process.env.CONSUMER_NAME || `consumer-${process.pid}`;
	}

	/**
	 * Create consumer group if it doesn't exist
	 * @param {string} stream - Stream name
	 * @param {string} group - Consumer group name
	 * @param {string} startId - Starting position ('0' for beginning, '$' for new messages)
	 */
	async createConsumerGroup(stream: string, group: string, startId = '0') {
		try {
			await this.redis!.xgroup('CREATE', stream, group, startId, 'MKSTREAM');
			console.log(`Consumer group '${group}' created for stream '${stream}'`);
		} catch (error) {
			console.log(
				`Consumer group '${group}' already exists for stream '${stream}' the error: `,
				error
			);
		}
	}

	/**
	 * Consume messages from a stream using consumer group
	 * @param {string} stream - Stream name
	 * @param {string} group - Consumer group name
	 * @param {function} messageHandler - Function to handle each message
	 * @param {object} options - Additional options
	 */
	async consumeFromGroup(
		stream: string,
		group: string,
		messageHandler: MessageHandler,
		options: ConsumerOptions = {}
	) {
		const { count = 1, blockTime = 1000, processingTimeout = 30000 } = options;

		console.log(
			`Starting consumer '${this.consumerName}' for group '${group}' on stream '${stream}'`
		);

		while (true) {
			const rawMessages = await this.redis!.xreadgroup(
				'GROUP',
				group,
				this.consumerName,
				'COUNT',
				count,
				'BLOCK',
				blockTime,
				'STREAMS',
				stream,
				'>'
			);

			const messages: StreamReadResult[] | null = rawMessages
				? (rawMessages as [string, [string, string[]][]][]).map(
						([streamName, msgs]) => ({
							streamName,
							messages: msgs.map(([messageId, fields]) => ({
								messageId,
								message: parseRedisFields(fields),
							})),
						})
					)
				: null;

			try {
				// todo Read pending messages first (messages that were delivered but not acknowledged)

				// Read new messages
				if (messages && messages.length > 0) {
					for (const item of messages) {
						const streamName = item.streamName;

						for (const message of item.messages) {
							const messageId = message.messageId;
							const data = message.message;

							await messageHandler(data, messageId, streamName);
							await this.redis!.xack(stream, group, messageId);
						}
					}
				}
			} catch (error) {
				console.error('❌ Error in consumer loop:', error);
				await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retrying
			}
		}
	}

	/**
	 * Initialize connection and set stream name
	 * @param streamName - Name of the Redis stream
	 * @param redisConfig - Redis connection configuration
	 */
	public async initialize(
		streamName: string,
		redisConfig: RedisConfig = {}
	): Promise<RedisStreamManager> {
		if (this.isConnected && this.streamName === streamName) {
			return this;
		}

		this.streamName = streamName;

		// Default Redis configuration
		const defaultConfig: RedisConfig = {
			host: 'localhost',
			port: 6379,
			retryDelayOnFailover: 100,
			maxRetriesPerRequest: 3,
			...redisConfig,
		};

		try {
			if (this.redis) {
				await this.redis.quit();
			}

			this.redis = new Redis(defaultConfig);

			// Wait for connection
			await new Promise<void>((resolve, reject) => {
				this.redis!.on('connecting', () => {
					console.log(`Connecting to Redis for stream: ${this.streamName}`);
				});

				this.redis!.on('ready', () => {
					this.isConnected = true;
					console.log(`Redis ready for stream: ${this.streamName}`);
					resolve();
				});

				this.redis!.on('error', (err) => {
					this.isConnected = false;
					console.error('Redis connection error:', err);
					reject(err);
				});
			});
			await this.redis!.ping();

			return this;
		} catch (error) {
			if (this.redis) {
				await this.redis.quit().catch(() => {});
				this.redis = null;
			}
			this.isConnected = false;
			throw new Error(
				`Failed to initialize Redis stream manager: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Add a message to the stream
	 * @param data - Data to add as key-value pairs
	 * @param id - Optional custom ID, defaults to '*' (auto-generated)
	 * @param options - Optional parameters like MAXLEN
	 */
	public async addMessageToStream(
		data: any,
		id: string = '*',
		options: StreamOptions = {}
	): Promise<string> {
		if (!this.isConnected || !this.redis) {
			throw new Error('Redis not connected. Call initialize() first.');
		}

		try {
			// Convert object to redis appropriate string
			const flatData = JSON.stringify(data);

			let args: string[] = [this.streamName!];

			// Add MAXLEN option if specified
			if (options.maxLen) {
				args.push('MAXLEN');
				if (options.approximate) {
					args.push('~');
				}
				args.push(options.maxLen.toString());
			}

			args.push(id, 'data', flatData); // redisio only allows data as the fieldname

			const messageId = await this.redis.xadd(
				...(args as [string, ...string[]])
			);
			// console.log(
			// 	`Message added to stream '${this.streamName}' with ID: ${messageId}`
			// );
			return messageId as string;
		} catch (error) {
			throw new Error(
				`Failed to add message to stream: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Read messages from the stream
	 * @param start - Starting ID (e.g., '0', '-', or specific ID)
	 * @param end - Ending ID (e.g., '+', or specific ID)
	 * @param count - Maximum number of messages to read
	 */
	public async readMessages(
		start: string = '0',
		end: string = '+',
		count: number = 100
	): Promise<StreamMessage[]> {
		if (!this.isConnected || !this.redis) {
			throw new Error('Redis not connected. Call initialize() first.');
		}

		try {
			// await this.redis.del(this.streamName!);
			const messages = await this.redis.xrange(
				this.streamName!,
				start,
				end,
				'COUNT',
				count
			);

			return messages.map(([id, fields]) => ({
				id,
				data: this.arrayToObject(fields),
			}));
		} catch (error) {
			throw new Error(
				`Failed to read messages from stream: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Get stream information
	 */
	public async getStreamInfo(): Promise<any> {
		if (!this.isConnected || !this.redis) {
			throw new Error('Redis not connected. Call initialize() first.');
		}

		try {
			return await this.redis.xinfo('STREAM', this.streamName!);
		} catch (error) {
			throw new Error(`Failed to get stream info: ${(error as Error).message}`);
		}
	}

	/**
	 * Get stream length
	 */
	public async getStreamLength(): Promise<number> {
		if (!this.isConnected || !this.redis) {
			throw new Error('Redis not connected. Call initialize() first.');
		}

		try {
			return await this.redis.xlen(this.streamName!);
		} catch (error) {
			throw new Error(
				`Failed to get stream length: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Helper method to convert flat array to object
	 */
	private arrayToObject(arr: string[]): MessageData {
		const obj: MessageData = {};
		for (let i = 0; i < arr.length; i += 2) {
			obj[arr[i]] = arr[i + 1];
		}
		return obj;
	}

	/**
	 * Close Redis connection
	 */
	public async disconnect(): Promise<void> {
		if (this.redis) {
			await this.redis.quit();
			this.isConnected = false;
			console.log('Redis connection closed');
		}
	}
}

export default RedisStreamManager;
