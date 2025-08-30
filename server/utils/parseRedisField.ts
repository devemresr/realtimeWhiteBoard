import { RedisMessage } from '../services/RedisStreamManager';

/**
 * Convert Redis fields array to JavaScript object
 */
function parseRedisFields(fields: string[] | string): RedisMessage {
	const obj: RedisMessage = {};

	console.log('fields.length', fields.length);

	for (let i = 0; i < fields.length; i += 2) {
		const key = fields[i];
		const value = fields[i + 1];

		try {
			obj[key] = JSON.parse(value);
		} catch {
			obj[key] = value;
		}
	}
	return obj;
}

export { parseRedisFields };
