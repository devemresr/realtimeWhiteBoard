// Decoded-token shape
/** Minimal claims expected inside a valid refresh/access token. */
export interface TokenPayload {
	userId: string;
	email: string;
	jti: string;
}
export const parseAccessToken = (token: string | null) => {
	if (!token) throw new Error('expected a token');

	const payload = token.split('.')[1];
	if (!payload) throw new Error('invalid JWT: missing payload');

	return JSON.parse(
		Buffer.from(payload, 'base64url').toString('utf8'),
	) as TokenPayload;
};

export const extractBearerToken = (
	authHeader: string | undefined,
): string | null => {
	if (!authHeader?.startsWith('Bearer ')) return null;
	return authHeader.slice('Bearer '.length).trim() || null;
};

export const extractAndParseAccessToken = (authHeader: string | undefined) => {
	return parseAccessToken(extractBearerToken(authHeader));
};
