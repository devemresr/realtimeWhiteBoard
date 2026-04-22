const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
	reactStrictMode: false,
	typescript: { ignoreBuildErrors: true },
	turbopack: {
		root: path.resolve(__dirname, '../'), // points to finalProject/
		resolveAlias: {
			'@/types': '../shared/types/index.ts',
			'@shared': '../shared',
		},
	},
	...(isProd && {
		outputFileTracingRoot: path.resolve(__dirname, '../'),
	}),
};

module.exports = nextConfig;
