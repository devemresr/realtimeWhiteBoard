declare global {
	namespace Express {
		interface Request {
			userId?: string;
			accessToken?: string;
			tokenRefreshNeeded?: boolean;
			tokenIsBlacklisted?: boolean;
		}
	}
}

export {};
