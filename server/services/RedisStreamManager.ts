import Redis from 'ioredis';
// import { addMessageWithInflightTracking } from '../scripts/addMessageWithInflightTracking';
import { REDIS_STREAMS } from '../../shared/constants/socketIoConstants';

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

	constructor(redis: Redis) {
		this.redis = redis;
		this.streamName = REDIS_STREAMS.DRAWING_EVENTS;
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
			const { roomId, packageId, packageSequenceNumber, strokes } = data;
			let args: string[] = [];

			// MAXLEN options if needed
			if (options.maxLen) {
				args.push('MAXLEN');
				if (options.approximate) {
					args.push('~');
				}
				args.push(options.maxLen.toString());
			}

			// Multiple field-value pairs
			args.push(
				'roomId',
				roomId,
				'strokeId',
				data.strokeId,
				'packageSequenceNumber',
				packageSequenceNumber.toString(),
				'strokeSequenceNumber',
				data.strokeSequenceNumber.toString(),
				'packageId',
				packageId,
				'originalSocketId',
				data.originalSocketId,
				'strokes',
				JSON.stringify(strokes) // Keep array as JSON
			);

			if (data.isLastPackage) {
				args.push('isLastPackage', data.isLastPackage.toString());
			}

			const redisMessageId = await this.redis.xadd(
				this.streamName!,
				'*',
				...args
			);
			console.log('redisMessageId', redisMessageId);

			if (!redisMessageId) {
				console.error('adding to the stream failed');
				throw new Error(`failed messageId ${redisMessageId}`);
			}

			console.log(
				`Message added to stream '${this.streamName}' with ID: ${redisMessageId}`
			);

			return redisMessageId as string;
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
