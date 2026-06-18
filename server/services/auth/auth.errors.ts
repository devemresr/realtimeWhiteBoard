import { TokenType } from 'utils/token.helpers';

// All auth errors in one place. Each carries its own HTTP status and client message
export class AuthError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public clientMessage: string,
	) {
		super(message);
		this.name = new.target.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class MissingRefreshTokenError extends AuthError {
	constructor() {
		super('No refresh token provided', 401, 'No refresh token provided');
	}
}

export class RevokedSessionError extends AuthError {
	constructor() {
		super('Session has been revoked', 401, 'Session has been revoked');
	}
}
export class ExpiredRefreshTokenError extends AuthError {
	constructor() {
		super('Refresh token expired', 401, 'Refresh token expired');
	}
}
export class InvalidRefreshToken extends AuthError {
	constructor() {
		super('Invalid refresh token', 401, 'invalid refresh token');
	}
}

export class MissingSecretError extends AuthError {
	constructor(secretName: string) {
		super(`${secretName} is not set`, 500, 'Internal server error');
	}
}
