import Redis from 'ioredis';
import { Socket } from 'socket.io';
import { attemptToSpendToken } from '../scripts/attemptToSpendToken';
import { getRemainingTokensScript } from '../scripts/getRemainingTokensScript';

interface spendTokenResponse {
	allowed: boolean;
	retryAfter?: number;
	error?: string;
}

class TokenBucket {
	private userId: string;
	private redis: Redis;
	private tokenCap: number;
	private refillRate: number;
	private cost: number;
	private TTLforBuckets: number;
	private keyPrefix: string = 'rate_limit:';

	constructor(
		redis: Redis,
		userId: string,
		tokenCap: number = 10000,
		refillRate: number = 1000,
		cost: number = 1000,
		TTLforBuckets: number = 3600,
	) {
		this.redis = redis;
		this.userId = userId;
		this.tokenCap = tokenCap;
		this.refillRate = refillRate;
		this.cost = cost;
		this.TTLforBuckets = TTLforBuckets;
	}

	private getRedisKey(): string {
		return `${this.keyPrefix}${this.userId}`;
	}

	public async spendToken(): Promise<spendTokenResponse> {
		const key = this.getRedisKey();
		const now = Date.now();

		// Lua script for atomic token bucket operation

		try {
			const result = (await this.redis.eval(
				attemptToSpendToken,
				1,
				key,
				now.toString(),
				this.tokenCap.toString(),
				this.refillRate.toString(),
				this.cost.toString(),
				this.TTLforBuckets,
			)) as number;

			const msPerToken = 1000 / this.refillRate;
			const retryAfter = Math.ceil(this.cost * msPerToken);
			if (result) {
				return { allowed: true };
			} else {
				return {
					allowed: false,
					retryAfter,
					error: 'Rate limit exceeded',
				};
			}
		} catch (error) {
			const errmsg =
				`Redis error in token bucket for user ${this.userId}:` + error;
			console.error(errmsg);
			// Fail closed - allow request if Redis is down retry after 5 sec
			// todo decide how to handle when there's a redis failure
			return { allowed: false, error: errmsg, retryAfter: 5000 };
		}
	}

	public async getRemainingTokens(): Promise<number> {
		const key = this.getRedisKey();
		const now = Date.now();

		try {
			const tokens = (await this.redis.eval(
				getRemainingTokensScript,
				1,
				key,
				now.toString(),
				this.tokenCap.toString(),
				this.refillRate.toString(),
			)) as number;

			return tokens;
		} catch (error) {
			console.error(
				`Redis error getting remaining tokens for user ${this.userId}:`,
				error,
			);
			return this.tokenCap;
		}
	}

	// shorten TTL of Redis data when user disconnects
	public async cleanup(TTLforCleanUp: number = 3600): Promise<void> {
		const key = this.getRedisKey();
		try {
			await this.redis.expire(key, TTLforCleanUp);
			console.log(`Cleaned up Redis data for user ${this.userId}`);
		} catch (error) {
			console.error(
				`Error cleaning up Redis data for user ${this.userId}:`,
				error,
			);
		}
	}
}
export default TokenBucket;
