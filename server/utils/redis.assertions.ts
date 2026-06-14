// TODO: Assertions are a short-term solution until Zod schemas are implemented.
//       Replace each assertion with fromSchema(Schema) once Zod schemas are
//       derived from Mongoose types using the ZodType<T> annotation pattern.

import {
	type BasePoint,
	type BoundingBox,
	type CanvasEvent,
	type CanvasMessage,
	type CanvasOperation,
	CanvasOperationType,
	type ConsumedCanvasEvent,
	type ConsumedCanvasMessage,
	type ConsumedCanvasOperation,
	type DrawingOperation,
	type DrawingPoint,
	type EraseEvent,
	type EraserOperation,
	type EraserPoint,
	type LassoOperation,
	type LassoPoint,
	type UserJoinEvent,
	type UserLeaveEvent,
	EventType,
	MessageCategory,
	MessageStatus,
} from '@/types';
import { Role } from 'controllers/constants/cacheKeys.constant';

export function assertString(val: unknown, field: string): string {
	if (typeof val !== 'string') throw new Error(`Expected string for ${field}`);
	return val;
}

function assertNumber(val: unknown, field: string): number {
	if (typeof val !== 'number') throw new Error(`Expected number for ${field}`);
	return val;
}
function assertBoolean(val: unknown, field: string): boolean {
	if (typeof val !== 'boolean')
		throw new Error(`Expected boolean for ${field}`);
	return val;
}
function optionalNumber(val: unknown, field: string) {
	if (val === undefined || val === null) return {};
	return { [field]: assertNumber(val, field) };
}

function optionalBoolean(val: unknown, field: string) {
	if (val === undefined || val === null) return {};
	return { [field]: assertBoolean(val, field) };
}
function assertOptionalString(val: unknown, field: string): string | undefined {
	if (val === undefined || val === null) return undefined;
	return assertString(val, field);
}
function assertOptionalNumber(val: unknown, field: string): number | undefined {
	if (val === undefined || val === null) return undefined;
	return assertNumber(val, field);
}

function assertOptionalBoolean(
	val: unknown,
	field: string,
): boolean | undefined {
	if (val === undefined || val === null) return undefined;
	if (typeof val !== 'boolean')
		throw new Error(`Expected boolean for ${field}`);
	return val;
}

function assertMessageStatus(val: unknown): MessageStatus {
	if (!Object.values(MessageStatus).includes(val as MessageStatus)) {
		throw new Error(`Invalid MessageStatus: ${val}`);
	}
	return val as MessageStatus;
}

function assertOptionalMessageStatus(val: unknown): MessageStatus | undefined {
	if (val === undefined || val === null) return undefined;
	return assertMessageStatus(val);
}
function optionalMessageStatus(val: unknown) {
	if (val === undefined || val === null) return {};
	return { status: assertMessageStatus(val) };
}

// ─── Points ──────────────────────────────────────────────────────────────────

export function assertBasePoint(val: unknown): BasePoint {
	const v = val as Record<string, unknown>;
	return {
		x: assertNumber(v.x, 'x'),
		y: assertNumber(v.y, 'y'),
		...optionalNumber(v.timestamp, 'timestamp'),
	};
}

export function assertDrawingPoint(val: unknown): DrawingPoint {
	const v = val as Record<string, unknown>;
	return {
		...assertBasePoint(v),
		brushSize: assertNumber(v.brushSize, 'brushSize'),
		brushColor: assertString(v.brushColor, 'brushColor'),
	};
}

export function assertEraserPoint(val: unknown): EraserPoint {
	const v = val as Record<string, unknown>;
	return {
		...assertBasePoint(v),
		brushSize: assertNumber(v.brushSize, 'brushSize'),
	};
}

export function assertLassoPoint(val: unknown): LassoPoint {
	return assertBasePoint(val);
}

// ─── Canvas operations ────────────────────────────────────────────────────────

function assertBaseCanvasOperationFields(v: Record<string, unknown>) {
	return {
		roomId: assertString(v.roomId, 'roomId'),
		category: MessageCategory.DRAWING as const,
		strokeId: assertString(v.strokeId, 'strokeId'),
		canvasMessageId: assertString(v.canvasMessageId, 'canvasMessageId'),
		packetSequenceNumber: assertNumber(
			v.packetSequenceNumber,
			'packetSequenceNumber',
		),
		strokeSequenceNumber: assertNumber(
			v.strokeSequenceNumber,
			'strokeSequenceNumber',
		),
		authorId: assertString(v.authorId, 'authorId'),
		status: assertMessageStatus(v.status),
		...optionalBoolean(v.isLastPacket, 'isLastPacket'),
		...optionalNumber(v.lastAttemptTimestamp, 'lastAttemptTimestamp'),
		...optionalNumber(v.timestamp, 'timestamp'),
	};
}

export function assertDrawingOperation(val: unknown): DrawingOperation {
	const v = val as Record<string, unknown>;
	if (!Array.isArray(v.points)) throw new Error('Expected points array');
	return {
		...assertBaseCanvasOperationFields(v),
		type: CanvasOperationType.DRAWING,
		points: v.points.map(assertDrawingPoint),
	};
}

export function assertEraserOperation(val: unknown): EraserOperation {
	const v = val as Record<string, unknown>;
	if (!Array.isArray(v.points)) throw new Error('Expected points array');
	return {
		...assertBaseCanvasOperationFields(v),
		type: CanvasOperationType.ERASER,
		points: v.points.map(assertEraserPoint),
	};
}

export function assertLassoOperation(val: unknown): LassoOperation {
	const v = val as Record<string, unknown>;
	if (!Array.isArray(v.points)) throw new Error('Expected points array');
	return {
		...assertBaseCanvasOperationFields(v),
		type: CanvasOperationType.LASSO,
		points: v.points.map(assertLassoPoint),
	};
}

export function assertCanvasOperation(val: unknown): CanvasOperation {
	const v = val as Record<string, unknown>;
	switch (v.type) {
		case CanvasOperationType.DRAWING:
			return assertDrawingOperation(val);
		case CanvasOperationType.ERASER:
			return assertEraserOperation(val);
		case CanvasOperationType.LASSO:
			return assertLassoOperation(val);
		default:
			throw new Error(`Unknown CanvasOperationType: ${v.type}`);
	}
}

// ─── Canvas events ────────────────────────────────────────────────────────────

function assertBaseCanvasEventFields(v: Record<string, unknown>) {
	return {
		roomId: assertString(v.roomId, 'roomId'),
		authorId: assertString(v.authorId, 'authorId'),
		canvasMessageId: assertString(v.canvasMessageId, 'canvasMessageId'),
		category: MessageCategory.EVENT as const,
		...optionalNumber(v.timestamp, 'timestamp'),
		...optionalMessageStatus(v.status),
	};
}

export function assertEraseEvent(val: unknown): EraseEvent {
	const v = val as Record<string, unknown>;
	if (!Array.isArray(v.erasedStrokeIds))
		throw new Error('Expected erasedStrokeIds array');
	return {
		...assertBaseCanvasEventFields(v),
		type: EventType.ERASE,
		erasedStrokeIds: v.erasedStrokeIds.map((id) =>
			assertString(id, 'erasedStrokeId'),
		),
	};
}

export function assertUserJoinEvent(val: unknown): UserJoinEvent {
	const v = val as Record<string, unknown>;
	return {
		...assertBaseCanvasEventFields(v),
		type: EventType.USER_JOIN,
	};
}

export function assertUserLeaveEvent(val: unknown): UserLeaveEvent {
	const v = val as Record<string, unknown>;
	return {
		...assertBaseCanvasEventFields(v),
		type: EventType.USER_LEAVE,
	};
}

export function assertCanvasEvent(val: unknown): CanvasEvent {
	const v = val as Record<string, unknown>;
	switch (v.type) {
		case EventType.ERASE:
			return assertEraseEvent(val);
		case EventType.USER_JOIN:
			return assertUserJoinEvent(val);
		case EventType.USER_LEAVE:
			return assertUserLeaveEvent(val);
		default:
			throw new Error(`Unknown EventType: ${v.type}`);
	}
}

export function assertCanvasMessage(val: unknown): CanvasMessage {
	const v = val as Record<string, unknown>;
	switch (v.category) {
		case MessageCategory.DRAWING:
			return assertCanvasOperation(val);
		case MessageCategory.EVENT:
			return assertCanvasEvent(val);
		default:
			throw new Error(`Unknown MessageCategory: ${v.category}`);
	}
}

// ─── Consumed variants ────────────────────────────────────────────────────────

export function assertConsumedCanvasOperation(
	val: unknown,
): ConsumedCanvasOperation {
	const v = val as Record<string, unknown>;
	const base = assertCanvasOperation(val) as Omit<
		CanvasOperation,
		'status' | 'lastAttemptTimestamp' | 'timestamp'
	>;
	return {
		...base,
		redisMessageId: assertString(v.redisMessageId, 'redisMessageId'),
	};
}

export function assertConsumedCanvasEvent(val: unknown): ConsumedCanvasEvent {
	const v = val as Record<string, unknown>;
	const base = assertCanvasEvent(val) as Omit<
		CanvasEvent,
		'status' | 'lastAttemptTimestamp' | 'timestamp'
	>;
	return {
		...base,
		redisMessageId: assertString(v.redisMessageId, 'redisMessageId'),
	};
}

export function assertConsumedCanvasMessage(
	val: unknown,
): ConsumedCanvasMessage {
	const v = val as Record<string, unknown>;
	switch (v.category) {
		case MessageCategory.DRAWING:
			return assertConsumedCanvasOperation(val);
		case MessageCategory.EVENT:
			return assertConsumedCanvasEvent(val);
		default:
			throw new Error(`Unknown MessageCategory: ${v.category}`);
	}
}

// ─── Bounding box ─────────────────────────────────────────────────────────────

export function assertBoundingBox(val: unknown): BoundingBox {
	const v = val as Record<string, unknown>;
	return {
		minX: assertNumber(v.minX, 'minX'),
		maxX: assertNumber(v.maxX, 'maxX'),
		minY: assertNumber(v.minY, 'minY'),
		maxY: assertNumber(v.maxY, 'maxY'),
	};
}

export function assertRole(val: unknown): Role {
	const role = assertString(val, 'role');

	if (!Object.values(Role).includes(role as Role)) {
		throw new Error('Invalid role');
	}
	return val as Role;
}
