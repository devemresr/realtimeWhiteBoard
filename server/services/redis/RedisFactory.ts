import { RedisClient } from './RedisClient';
import { RedisOptions } from 'ioredis';

export class RedisFactory {
	private static instances = new Map<string, RedisClient>();

	static async createClient(
		config?: RedisOptions,
		instanceKey: string = 'default',
	): Promise<RedisClient> {
		if (this.instances.has(instanceKey)) {
			throw new Error(
				`Redis instance "${instanceKey}" already exists use getInstance() instead`,
			);
		}

		const client = await RedisClient.create(config, instanceKey);
		this.instances.set(instanceKey, client);

		return this.instances.get(instanceKey)!;
	}

	static getInstance(instanceKey = 'default') {
		const client = this.instances.get(instanceKey);
		if (!client) {
			throw new Error(`Redis not initialized: ${instanceKey} `);
		}
		return client;
	}
}
