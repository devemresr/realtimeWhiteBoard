import logger from 'utils/logger';
import allowedOrigins from './allowedOrigins';

const corsOptions = {
	origin: (
		origin: string | undefined,
		callback: (error: Error | null, allow?: boolean) => void,
	) => {
		if (isOriginAllowed(origin)) {
			callback(null, true);
		} else {
			logger.error(
				{ corsError: `${origin} isnt allowed`, allowedOrigins },
				'CORS error',
			);
			callback(new Error('not allowed by CORS'));
		}
	},
	exposedHeaders: ['ip-blocked', 'x-refreshed-token'],
	credentials: true,
	optionsSuccessStatus: 200,
};

export default corsOptions;

const isOriginAllowed = (origin?: string) => {
	return (
		!origin ||
		(!origin && allowedOrigins.includes(origin)) ||
		process.env.NODE_ENV === 'development'
	);
};
