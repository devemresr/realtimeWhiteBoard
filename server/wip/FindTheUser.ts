import Redis from 'ioredis';
import { REDIS_CONFIG } from '../controllers/socketController';
import { Users } from '../models/Users';
import { UserData } from '../models/Users';
import { Types } from 'mongoose';
import { UserDocument } from '../middleware/refreshAccessToken';

export type SafeUserDocument = NonNullable<UserDocument>;

class FindTheUser {
	private redis: Redis;

	constructor() {
		this.redis = new Redis(REDIS_CONFIG);
		this.checkTheCache = this.checkTheCache.bind(this);
		this.checkTheDb = this.checkTheDb.bind(this);
		this.checkBoth = this.checkBoth.bind(this);
	}

	async checkTheCache(userId: string): Promise<null | UserData> {
		try {
			const cachedData = await this.redis.get(
				`recentUsersWithChangedInfos:${userId}`,
			);
			console.log('cachedData', cachedData);
			return cachedData ? JSON.parse(cachedData) : null;
		} catch (error) {
			console.error('Cache lookup error:', error);
			return null;
		}
	}

	async checkTheDb(userId: string): Promise<SafeUserDocument | null> {
		try {
			return await Users.findOne({ _id: new Types.ObjectId(userId) }).select(
				'-password',
			);
		} catch (error) {
			console.error('Database lookup error:', error);
			return null;
		}
	}

	async checkBoth(userId: string): Promise<SafeUserDocument | UserData> {
		const isInCache = (await this.checkTheCache(userId)) ?? null;
		const foundUser = isInCache ?? (await this.checkTheDb(userId));
		console.log('foundUser: ', foundUser);

		if (!foundUser) {
			throw new Error('no user found');
		}

		// Cache DB result if it came from database
		if (!isInCache) {
			try {
				await this.redis.setex(
					`recentUsersWithChangedInfos:${userId}`,
					60 * 5,
					JSON.stringify(foundUser),
				);
			} catch (error) {
				console.error('Failed to cache user data:', error);
			}
		}

		return foundUser;
	}

	async invalidateUserCache(userId: string): Promise<void> {
		try {
			await this.redis.del(`recentUsersWithChangedInfos:${userId}`);
		} catch (error) {
			console.error('Cache invalidation error:', error);
		}
	}

	async cacheUserData(
		userId: string,
		userData: SafeUserDocument,
		ttl: number = 300,
	): Promise<void> {
		try {
			await this.redis.setex(
				`recentUsersWithChangedInfos:${userId}`,
				ttl,
				JSON.stringify(userData),
			);
		} catch (error) {
			console.error('Failed to cache user data:', error);
		}
	}

	async getUserCacheTTL(userId: string): Promise<number> {
		try {
			const ttl = await this.redis.ttl(`recentUsersWithChangedInfos:${userId}`);
			return ttl;
		} catch (error) {
			console.error('Error checking TTL:', error);
			return -2; // treat as missing
		}
	}
}

export default FindTheUser;
