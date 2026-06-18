// todo change to sensible values
export const JWT_EXPIRE_TIMES = {
	ACCESSTOKEN:
		process.env.NODE_ENV === 'production'
			? 15 * 60 * 1000 // 15m
			: 24 * 24 * 60 * 60 * 1000, //24d
	REFRESHTOKEN:
		process.env.NODE_ENV === 'production'
			? 7 * 24 * 60 * 60 * 1000 // 7 days
			: 24 * 24 * 60 * 60 * 1000, // 24 days
} as const;
