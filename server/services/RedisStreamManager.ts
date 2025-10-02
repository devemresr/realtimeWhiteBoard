import Redis from 'ioredis';
import { addMessageWithInflightTracking } from '../scripts/addMessageWithInflightTracking';

interface StreamOptions {
	maxLen?: number;
	approximate?: boolean;
}

export interface RedisMessage {
	[key: string]: any;
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
	private streamName: string | null = null;
	private consumerName: string;

	constructor(redis: Redis) {
		this.redis = redis;
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
		if (!this.redis) {
			throw new Error('Redis instance is undefined');
		}

		try {
			// Convert object to redis appropriate string
			const { roomId } = data;
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

			console.log('data', data, 'args', args);

			const response = await this.redis
				.eval(addMessageWithInflightTracking, 1, roomId, ...args)
				.then((i) => JSON.parse(i as string));
			const { result, messageId } = response;
			console.log('the inflight resutl', response);

			if (!result) {
				console.error('adding to the stream failed');
				throw new Error(`failed messageId ${messageId}`);
			}

			console.log(
				`Message added to stream '${this.streamName}' with ID: ${messageId}`
			);

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
		if (!this.redis) {
			throw new Error('Redis instance is undefined');
		}

		try {
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
		if (!this.redis) {
			throw new Error('Redis instance is undefined');
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
		if (!this.redis) {
			throw new Error('Redis instance is undefined');
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
			console.log('Redis connection closed');
		}
	}
}

export default RedisStreamManager;
