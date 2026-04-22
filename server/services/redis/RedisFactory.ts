import { RedisClient } from './RedisClient';
import Redis, { RedisOptions } from 'ioredis';

export class RedisFactory {
	private static instances = new Map<string, RedisClient>();

	static async createClient(
		config?: RedisOptions,
		instanceKey: string = 'default',
	): Promise<RedisClient> {
		if (this.instances.has(instanceKey)) {
			return this.instances.get(instanceKey)!;
		}

		const client = new RedisClient(config);
		await client.connect();

		this.instances.set(instanceKey, client);
		return client;
	}

	static getInstance(instanceKey: string = 'default'): RedisClient | null {
		return this.instances.get(instanceKey) || null;
	}

	static async disconnectAll(): Promise<void> {
		const disconnectPromises = Array.from(this.instances.values()).map(
			(client) => client.disconnect(),
		);

		await Promise.all(disconnectPromises);
		this.instances.clear();
	}

	static async waitForAllConnections(timeoutMs: number = 10000): Promise<void> {
		const waitPromises = Array.from(this.instances.values()).map((client) =>
			client.waitForConnection(timeoutMs),
		);

		await Promise.all(waitPromises);
	}
}
