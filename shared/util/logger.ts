import pino from 'pino';

const isDev = process.env.ENVIRONMENT !== 'production';

const logger = pino({
	level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

	// Pretty printing for development
	...(isDev && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'yyyy-mm-dd HH:MM:ss',
				ignore: 'pid,hostname',
				singleLine: false,
			},
		},
	}),

	...(!isDev && {
		base: undefined,
		// Readable timestamp
		timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
		// Use string level names instead of numbers
		formatters: {
			level: (label) => {
				return { level: label };
			},
		},
	}),
});

export default logger;
