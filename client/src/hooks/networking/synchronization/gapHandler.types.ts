import { CanvasOperation } from '@/types';

export type HandleGapFilledFn = (
	packet: CanvasOperation,
	sequence: number,
) => void;
export type HandleGapPermanentFn = (
	packet: CanvasOperation,
	sequence: number,
) => void;
