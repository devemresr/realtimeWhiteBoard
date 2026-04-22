import Redis from 'ioredis';
import { Socket } from 'socket.io';
import TokenBucket from './TokenBucket';

interface TokenBucketConfig {
	tokenCap: number;
	refillRate: number;
	cost: number;
	TTLforBuckets?: number;
}

class TokenBucketManager {
	private redis: Redis;
	private tokenBuckets: Map<string, TokenBucket>;
	private config: TokenBucketConfig;

	constructor(redis: Redis, config?: Partial<TokenBucketConfig>) {
		this.redis = redis;
		this.tokenBuckets = new Map();
		this.config = {
			// todo replace these with actual limits
			tokenCap: config?.tokenCap ?? 1000000,
			refillRate: config?.refillRate ?? 2000,
			cost: config?.cost ?? 1000,
			TTLforBuckets: config?.TTLforBuckets ?? 3600,
		};
	}

	// todo replace socketId with userId once auth is implemented
	public getOrCreateBucket(socket: Socket): TokenBucket {
		const userId = socket.data.userId || socket.id;

		if (!this.tokenBuckets.has(userId)) {
			const bucket = new TokenBucket(
				this.redis,
				userId,
				this.config.tokenCap,
				this.config.refillRate,
				this.config.cost,
				this.config.TTLforBuckets,
			);
			this.tokenBuckets.set(userId, bucket);
			console.log(`Created token bucket for user ${userId}`);
		}

		return this.tokenBuckets.get(userId)!;
	}

	public async removeBucket(
		userId: string,
		cleanupTTL?: number,
	): Promise<void> {
		const bucket = this.tokenBuckets.get(userId);
		if (bucket) {
			await bucket.cleanup(cleanupTTL);
			this.tokenBuckets.delete(userId);
			console.log(`Removed token bucket for user ${userId}`);
		}
	}

	public async cleanupAllBuckets(): Promise<void> {
		const promises = Array.from(this.tokenBuckets.entries()).map(
			([userId, bucket]) => this.removeBucket(userId),
		);
		await Promise.all(promises);
		console.log('All token buckets cleaned up');
	}

	public getBucketCount(): number {
		return this.tokenBuckets.size;
	}
}

export default TokenBucketManager;
