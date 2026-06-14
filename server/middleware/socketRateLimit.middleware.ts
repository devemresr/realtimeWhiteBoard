import TokenBucket from '../services/rate-limit/TokenBucket';
import { Socket } from 'socket.io';

class RateLimitError extends Error {
	retryAfter: number;

	constructor(retryAfter: number, message: string = 'Rate limit exceeded') {
		super(message);
		this.retryAfter = retryAfter;
		this.name = 'RateLimitError';
	}
}

const socketRateLimitMiddleware = (
	socket: Socket,
	tokenBucket: TokenBucket,
	next: any,
) => {
	return async (packet: any[], next: (err?: RateLimitError) => void) => {
		const result = await tokenBucket.spendToken();
		console.log('rate limit result: ', result);

		if (!result.allowed) {
			return next(
				new RateLimitError(
					result.retryAfter ?? 0,
					result.error ?? 'rate limit exceed',
				),
			);
		}
		next();
	};
};

// todo decide which events going to be excluded from rate limiting
const shouldSkipLimitingEvent = (eventName: string) => {
	const skipRateLimitEvents = ['Broadcast'];
	return skipRateLimitEvents.includes(eventName);
};

export default socketRateLimitMiddleware;
