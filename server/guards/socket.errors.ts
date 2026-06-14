// base error type throwing this ensures the error is expected
export class SocketError extends Error {
	constructor(
		message: string, // client-safe message
		public readonly context?: Record<string, unknown>, // internal debug info, never sent to client
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class RateLimitError extends SocketError {
	constructor(remainingTokens: number) {
		super('RATE_LIMITED', { remainingTokens });
	}
}

export class NotInRoomError extends SocketError {
	constructor(userId: string, roomId: string) {
		super('NOT_IN_ROOM', { userId, roomId });
	}
}

export class RoleChangedError extends SocketError {
	constructor(socketRole: string, actualRole: string) {
		super('ROLE_CHANGED', { socketRole, actualRole });
	}
}

export class IdentityMismatchError extends SocketError {
	constructor(context: Record<string, unknown>) {
		super('IDENTITY_MISMATCH', context);
	}
}

export class ForbiddenError extends SocketError {
	constructor(context: Record<string, unknown>) {
		super('FORBIDDEN', context);
	}
}

export class MissingPayloadError extends SocketError {
	constructor(field: string, context?: Record<string, unknown>) {
		super('MISSING_PAYLOAD_FIELD', { field, ...context });
	}
}
