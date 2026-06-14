import { MessageCategory, MessageStatus } from './message.types';
import { DrawingPoint, EraserPoint, LassoPoint } from './points.types';

export enum CanvasOperationType {
	DRAWING = 'drawing',
	ERASER = 'eraser',
	LASSO = 'lasso',
}

export type CanvasOperationTypeToPoints = {
	[CanvasOperationType.DRAWING]: DrawingPoint;
	[CanvasOperationType.ERASER]: EraserPoint;
	[CanvasOperationType.LASSO]: LassoPoint;
};

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
