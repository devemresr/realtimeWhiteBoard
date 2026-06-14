import pino from 'pino';

const env = process.env.NODE_ENV;
const isPrettyLog = process.env.NODE_ENV !== 'production';

const logger = pino({
	level:
		process.env.LOG_LEVEL ??
		(env === 'development' || 'test' ? 'debug' : 'info'),

	// Pretty printing for development
	...(isPrettyLog && {
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

	...(env === 'production' && {
		base: { pid: false, hostname: false },
		timestamp: pino.stdTimeFunctions.isoTime,
		formatters: { level: (label) => ({ level: label }) },
	}),

	// Add error serialization for better error logging
	redact: ['req.headers.authorization', 'req.headers.cookie'],
	serializers: {
		err: pino.stdSerializers.err,
	},
});

export default logger;
