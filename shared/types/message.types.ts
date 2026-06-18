import { CanvasEvent, EventType } from './canvasEvent.types';
import { CanvasOperation, CanvasOperationType } from './canvasOperation.types';

export enum MessageCategory {
	DRAWING = 'drawing',
	EVENT = 'event',
}

export enum MessageStatus {
	CREATED = 'CREATED', // Just created, not sent yet
	SENDING = 'SENDING', // Currently being sent
	SENT = 'SENT',
	ACKNOWLEDGED = 'ACKNOWLEDGED', // Server sent back ack
	RECEIVED = 'RECEIVED', // Received from another user
	FAILED = 'FAILED', // Failed, will retry
	ABANDONED = 'ABANDONED', // Max retries reached, gave up sending
	LOCAL = 'LOCAL',
}

export type CanvasMessage = CanvasOperation | CanvasEvent;
export type CanvasMessageType = EventType | CanvasOperationType;

type ToConsumedCanvasMessage<T> = Omit<
	T,
	'status' | 'lastAttemptTimestamp' | 'timestamp'
> & { redisMessageId: string };

export type ConsumedCanvasOperation = ToConsumedCanvasMessage<CanvasOperation>;
export type ConsumedCanvasEvent = ToConsumedCanvasMessage<CanvasEvent>;
export type ConsumedCanvasMessage =
	| ConsumedCanvasOperation
	| ConsumedCanvasEvent;

/**
 * Bounding box information for packets' point data.
 * Used for spatial indexing and collision detection.
 *
 * @remarks
 * Can be computed from a CanvasOperation's points to determine:
 * - Which strokes intersect with an eraser path
 * - Which strokes are within a lasso selection
 * - Efficient canvas viewport culling
 */
export interface BoundingBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}
