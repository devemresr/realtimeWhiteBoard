export interface BasePoint {
	x: number;
	y: number;
	timestamp?: number;
}

export enum MessageCategory {
	DRAWING = 'drawing',
	EVENT = 'event',
}

export enum CanvasOperationType {
	DRAWING = 'drawing',
	ERASER = 'eraser',
	LASSO = 'lasso',
}

export enum EventType {
	ERASE = 'erase',
	USER_JOIN = 'user_join',
	USER_LEAVE = 'user_leave',
}

export interface DrawingPoint extends BasePoint {
	brushSize: number;
	brushColor: string;
}

export interface EraserPoint extends BasePoint {
	brushSize: number;
}

export interface LassoPoint extends BasePoint {
	// not implemented yet
}

export type CanvasOperationTypeToPoints = {
	[CanvasOperationType.DRAWING]: DrawingPoint;
	[CanvasOperationType.ERASER]: EraserPoint;
	[CanvasOperationType.LASSO]: LassoPoint;
};

export type CanvasPoint = EraserPoint | DrawingPoint | LassoPoint;
export enum MessageStatus {
	CREATED = 'CREATED', // Just created, not sent yet
	SENDING = 'SENDING', // Currently being sent
	SENT = 'SENT',
	ACKNOWLEDGED = 'ACKNOWLEDGED', // Server sent back ack
	RECEIVED = 'RECEIVED', // Received from another user
	FAILED = 'FAILED', // Failed, will retry
	ABANDONED = 'ABANDONED', // Max retries reached, gave up sending
}

/**
 * Base CanvasOperation interface containing all shared fields across CanvasOperation types.
 * This is not exported directly - use the CanvasOperation discriminated union instead.
 *
 * @remarks
 * Fields are organized into three categories:
 * - Network Metadata: Core fields sent over the wire for ordering/deduplication
 * - Drawing Data: The actual point data and author information
 * - Status Tracking: Client-side only fields for retry logic and debugging
 */
interface BaseCanvasOperation {
	// ===== Network Metadata =====
	// Sent over the wire
	roomId: string; // Which room/canvas this belongs to
	category: MessageCategory.DRAWING;
	strokeId: string; // Unique ID for the entire stroke
	canvasMessageId: string; // Unique ID for this specific CanvasOperation
	packetSequenceNumber: number; // Order within the stroke (1, 2, 3...)
	strokeSequenceNumber: number; // Order of local strokes
	isLastPacket?: boolean; // True if this is the final CanvasOperation of a stroke

	// ===== Drawing Data =====
	// Sent over the wire
	authorId: string; // User who created this CanvasOperation

	// ===== Status Tracking =====
	// Client-side only (not sent over network)
	status: MessageStatus; // Current transmission status
	lastAttemptTimestamp?: number; // When we last tried to send this CanvasOperation
	timestamp?: number; // Client creation time for debugging/ordering
}

/**
 * Discriminated union of canvasOperation types.
 * The `type` field determines which point type the canvasOperation contains.
 *
 * @remarks
 * This ensures type safety at compile time:
 * - CanvasOperationType.DRAWING → must contain DrawingPoint[]
 * - CanvasOperationType.ERASER → must contain EraserPoint[]
 * - CanvasOperationType.LASSO → must contain LassoPoint[]
 *
 * TypeScript will automatically narrow the point type when you switch on canvasOperation.type,
 * eliminating the need for type guards or assertions.
 *
 * @example
 * function handleOperation(canvasOperation: CanvasOperation) {
 *   switch (canvasOperation.type) {
 *     case CanvasOperationType.DRAWING:
 *       const color = canvasOperation.points[0].brushColor;
 *       break;
 *     case CanvasOperationType.ERASER:
 *       const size = canvasOperation.points[0].brushSize;
 *       break;
 *   }
 * }
 */

interface BaseCanvasEvent {
	roomId: string;
	authorId: string;
	canvasMessageId: string;
	category: MessageCategory.EVENT;
	timestamp?: number;
	status?: MessageStatus;
}

export type EraseEvent = BaseCanvasEvent & {
	type: EventType.ERASE;
	erasedStrokeIds: string[];
};

export type UserJoinEvent = BaseCanvasEvent & {
	type: EventType.USER_JOIN;
};

export type UserLeaveEvent = BaseCanvasEvent & {
	type: EventType.USER_LEAVE;
};

export type DrawingOperation = BaseCanvasOperation & {
	type: CanvasOperationType.DRAWING;
	points: DrawingPoint[]; // Must have brushSize and brushColor
};

export type EraserOperation = BaseCanvasOperation & {
	type: CanvasOperationType.ERASER;
	points: EraserPoint[]; // Must have brushSize only
};
export type LassoOperation = BaseCanvasOperation & {
	type: CanvasOperationType.LASSO;
	points: LassoPoint[]; // Just x, y coordinates
};

export type CanvasOperation =
	| DrawingOperation
	| EraserOperation
	| LassoOperation;
export type CanvasEvent = EraseEvent | UserJoinEvent | UserLeaveEvent;
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
