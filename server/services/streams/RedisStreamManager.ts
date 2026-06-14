import Redis from 'ioredis';
import {
	REDIS_KEYS,
	RedisStream,
} from 'controllers/constants/cacheKeys.constant';
import { CanvasOperation } from '@/types';
import { addToStreamAndDedup } from 'scripts/addToStreamAndDedup';
import logger from '@shared/util/logger';

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
/**
 * Uses the main Redis instance (not the Socket.io adapter Redis).
 * Redis Streams are an app-level concern.
 * This is unrelated to how Socket.io syncs events between server nodes.
 */
class RedisStreamManager {
	private redis: Redis | null = null;
	private streamName: string | null = null;
	private MESSAGE_KEY: keyof CanvasOperation = 'canvasMessageId';

	constructor(redis: Redis) {
		this.redis = redis;
		this.streamName = RedisStream.DRAWING;
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
		options: StreamOptions = {},
	): Promise<string> {
		if (!this.redis) {
			throw new Error('Redis instance is undefined');
		}

		// Convert object to redis appropriate string
		let args: string[] = ['*'];

		// MAXLEN options if needed
		if (options.maxLen) {
			args.push('MAXLEN');
			if (options.approximate) {
				args.push('~');
			}
			args.push(options.maxLen.toString());
		}

		let canvasMessageIds: string[] = [];
		const log = logger.child({ method: 'addMessageToStream' });
		log.debug({ data });

		const { authorId, roomId } = data;
		const fieldValuePairs = Object.entries(data).flatMap(([key, value]) => {
			log.debug({ key, value });
			if (key === this.MESSAGE_KEY) canvasMessageIds.push(value as string);
			return [
				key,
				typeof value === 'object' && value !== null
					? JSON.stringify(value)
					: String(value ?? ''),
			];
		});

		if (!roomId) throw new Error('roomId is required for dedup');
		if (!authorId) throw new Error('authorId is required');

		let redisMessageId: string | null;
		try {
			redisMessageId = (await this.redis.eval(
				addToStreamAndDedup,
				3,
				this.streamName!,
				REDIS_KEYS.dedupKey(roomId),
				REDIS_KEYS.msgAuthorKey(roomId),
				JSON.stringify(canvasMessageIds),
				authorId,
				...args,
				...fieldValuePairs,
			)) as string | null;
		} catch (error) {
			console.error('Stream write failed at Redis level', error);
			throw new Error(
				`XADD failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		if (redisMessageId === null) {
			console.warn('Duplicate message detected, skipping', {
				canvasMessageIds,
			});
			throw new Error(
				`Duplicate message detected, skipping write: ${JSON.stringify(canvasMessageIds)}`,
			);
		}

		console.log('fieldValuePairs', fieldValuePairs, 'args', args);
		console.log(
			`Message added to stream '${this.streamName}' with ID: ${redisMessageId}`,
		);

		return redisMessageId as string;
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
		count: number = 100,
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
				count,
			);

			return messages.map(([id, fields]) => ({
				id,
				data: Object.fromEntries(this.toPairs(fields)),
			}));
		} catch (error) {
			throw new Error(
				`Failed to read messages from stream: ${(error as Error).message}`,
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
				`Failed to get stream length: ${(error as Error).message}`,
			);
		}
	}

	private toPairs(flat: string[]): [string, string][] {
		if (flat.length % 2 !== 0)
			throw new Error(`Expected even-length fields array, got ${flat.length}`);
		const pairs: [string, string][] = [];
		for (let i = 0; i < flat.length; i += 2) {
			pairs.push([flat[i]!, flat[i + 1]!]);
		}
		return pairs;
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
