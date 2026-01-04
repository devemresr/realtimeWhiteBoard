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
		timestamp: pino.stdTimeFunctions.isoTime, // More efficient than custom function
		formatters: {
			level: (label) => ({ level: label }),
		},
	}),

	// Add error serialization for better error logging
	serializers: {
		error: pino.stdSerializers.err,
	},
});

export default logger;
