import allowedOrigins from './allowedOrigins';

const corsOptions = {
	origin: (
		origin: string | undefined,
		callback: (error: Error | null, allow?: boolean) => void
	) => {
		console.log('Origin:', origin);
		const timestamp = new Date().toISOString();
		if (
			(origin && allowedOrigins.indexOf(origin) !== -1) ||
			// todo delete in prod
			process.env.ENVIRONMENT === 'development'
		) {
			callback(null, true);
		} else {
			console.log('CORS error at', timestamp, 'for origin:', origin);
			callback(new Error('not allowed by CORS'));
		}
	},
	exposedHeaders: ['ip-blocked', 'x-refreshed-token'],
	credentials: true,
	optionsSuccessStatus: 200,
};

export default corsOptions;
