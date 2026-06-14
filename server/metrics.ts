import { Histogram } from 'prom-client';

export const redisCmdDuration = new Histogram({
	name: 'redis_command_duration_seconds',
	help: 'Duration of Redis commands',
	labelNames: ['command', 'client'],
	buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});
