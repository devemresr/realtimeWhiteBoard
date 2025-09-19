import Redis from 'ioredis';
import { Socket } from 'socket.io';

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
		TTLforBuckets: number = 3600
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
		const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local cost = tonumber(ARGV[4])
      local TTLforBuckets = tonumber(ARGV[5])
      
      -- Get current state in lua arrays start at 1
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local time_elapsed = (now - last_refill) / 1000 -- convert to seconds
      local tokens_to_add = time_elapsed * refill_rate
      tokens = math.min(capacity, tokens + tokens_to_add)
      
      -- Check if we can consume
      if tokens >= cost then
        tokens = tokens - cost
        -- Update state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, TTLforBuckets) -- expire after 1 hour of inactivity (the default)
        return 1 -- allowed
      else
        -- Update state even if not consuming (for accurate refill tracking)
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, TTLforBuckets)
        return 0 -- not allowed
      end
    `;

		try {
			const result = (await this.redis.eval(
				luaScript,
				1,
				key,
				now.toString(),
				this.tokenCap.toString(),
				this.refillRate.toString(),
				this.cost.toString(),
				this.TTLforBuckets
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
			// todo currently were failing closed might need to find a way around to serve with reduced feautures
			return { allowed: false, error: errmsg, retryAfter: 5000 };
		}
	}

	public async getRemainingTokens(): Promise<number> {
		const key = this.getRedisKey();
		const now = Date.now();

		const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      local time_elapsed = (now - last_refill) / 1000
      local tokens_to_add = time_elapsed * refill_rate
      tokens = math.min(capacity, tokens + tokens_to_add)
      
      return math.floor(tokens)
    `;

		try {
			const tokens = (await this.redis.eval(
				luaScript,
				1, // tells redis how many args are keys
				key,
				now.toString(),
				this.tokenCap.toString(),
				this.refillRate.toString()
			)) as number;

			return tokens;
		} catch (error) {
			console.error(
				`Redis error getting remaining tokens for user ${this.userId}:`,
				error
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
				error
			);
		}
	}
}
export default TokenBucket;
