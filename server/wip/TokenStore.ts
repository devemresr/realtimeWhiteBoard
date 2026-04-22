import Redis from 'ioredis';
import { REDIS_CONFIG } from '../controllers/socketController';

class TokenStore {
	private redis: Redis;
	constructor() {
		this.redis = new Redis(REDIS_CONFIG);
		this.blacklistToken = this.blacklistToken.bind(this);
		this.isTokenRevoked = this.isTokenRevoked.bind(this);
	}

	async blacklistToken(jti: string, ttl: number) {
		await this.redis.set(`blacklist:${jti}`, 'revoked', 'EX', ttl);
	}

	async isTokenRevoked(jti: string) {
		return (await this.redis.get(`blacklist:${jti}`)) !== null;
	}

	async getTokenTTL(jti: string): Promise<any> {
		try {
			const ttl = await this.redis.ttl(`blacklist:${jti}`);
			return ttl;
		} catch (error) {
			console.error('Error checking TTL:', error);
			return -2; // treat as missing
		}
	}
}

export default TokenStore;
