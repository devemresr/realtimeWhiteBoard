module.exports = { extractCookieAndUserId };

function extractCookieAndUserId(requestParams, response, context, ee, next) {
	const cookies = response.headers['set-cookie'] ?? [];
	const jwtCookie = cookies.find((c) => c.startsWith('jwt=')) ?? '';
	context.vars.jwtCookie = jwtCookie.split(';')[0];

	const accessToken = context.vars.authToken;
	if (accessToken) {
		const payload = JSON.parse(
			Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
		);
		context.vars.userId = payload.userId;
	}
	return next();
}
