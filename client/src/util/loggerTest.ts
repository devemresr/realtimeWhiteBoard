import pino, {
	type Logger,
	type LoggerOptions,
	type SerializedError,
} from 'pino';

const env =
	typeof process !== 'undefined' ? process.env.NODE_ENV : 'development';

const isDev = env === 'development';
const isTest = env === 'test';

function safeStringify(o: unknown): string {
	return JSON.stringify(
		o,
		(key, value) => {
			if (value instanceof Map) {
				return Object.fromEntries(value);
			}
			if (value instanceof Set) {
				return Array.from(value);
			}
			if (value instanceof Error) {
				return { message: value.message, stack: value.stack };
			}
			return value;
		},
		2,
	);
}

const loggerOptions: LoggerOptions = {
	level:
		(typeof process !== 'undefined' && process.env.LOG_LEVEL) ||
		(isDev || isTest ? 'debug' : 'info'),

	base: {
		app: 'canvas-app',
		env,
	},

	timestamp: pino.stdTimeFunctions.isoTime,

	formatters: {
		level(label) {
			return {
				level: label.toUpperCase(),
			};
		},
	},

	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err,
	},

	redact: {
		paths: [
			'authorization',
			'token',
			'accessToken',
			'refreshToken',
			'password',
			'headers.authorization',
			'headers.cookie',
			'user.password',
		],
		remove: true,
	},

	browser: {
		asObject: true,
		serialize: true,

		write: {
			fatal(o) {
				console.error('[FATAL]', JSON.stringify(o, null, 2));
			},
			error(o) {
				console.error('[ERROR]', JSON.stringify(o, null, 2));
			},
			warn(o) {
				console.warn('[WARN]', JSON.stringify(o, null, 2));
			},
			info(o) {
				console.info('[INFO]', JSON.stringify(o, null, 2));
			},
			debug(o) {
				console.debug(safeStringify(o));
			},
			trace(o) {
				console.trace('[TRACE]', JSON.stringify(o, null, 2));
			},
		},
	},
};

const logger: Logger = pino(loggerOptions);

export default logger;
