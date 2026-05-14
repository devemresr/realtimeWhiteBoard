import Redis from 'ioredis';

class TokenBlacklist {
	private redis: Redis;
	constructor(redis: Redis) {
		this.redis = redis;
		this.blacklistToken = this.blacklistToken.bind(this);
		this.isTokenRevoked = this.isTokenRevoked.bind(this);
	}

	async blacklistToken(jti: string, ttl: number) {
		await this.redis.set(`blacklist:${jti}`, 'revoked', 'EX', ttl);
	}

	async isTokenRevoked(jti: string) {
		return (await this.redis.get(`blacklist:${jti}`)) !== null;
	}
}

export default TokenBlacklist;
