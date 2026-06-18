import { useCallback } from 'react';
import { toast } from 'react-toastify';
import logger from 'src/util/loggerTest';

export type Callback = (response: {
	success?: boolean;
	error?: string;
}) => void;

const ERROR_MESSAGES: Record<string, string> = {
	NOT_IN_ROOM: 'Not in a room.',
	ROLE_CHANGED: 'Your permissions changed. Please refresh.',
	IDENTITY_MISMATCH: 'Session error. Please refresh.',
	FORBIDDEN: "You don't have permission to fulfill that operation.",
	MISSING_PAYLOAD: 'Invalid operation. Please try again.',
	INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again.',
};

type UsePacketErrorHandlerParams = {
	redrawCanvasWithoutErasedStrokes: () => void;
	eraseStroke: (strokeId: string) => void;
};

const getErrorMessage = (error: unknown): string => {
	if (typeof error === 'string') return error;

	if (error instanceof Error) return error.message;

	if (
		typeof error === 'object' &&
		error !== null &&
		'msg' in error &&
		typeof error.msg === 'string'
	) {
		return error.msg;
	}

	return 'UNKNOWN_ERROR';
};

export const usePacketErrorHandler = ({
	redrawCanvasWithoutErasedStrokes,
	eraseStroke,
}: UsePacketErrorHandlerParams) => {
	const handleCallbackError = useCallback(
		(error: string, strokeId?: string) => {
			const errorKey = getErrorMessage(error);
			const message =
				ERROR_MESSAGES[errorKey] ?? 'Something went wrong. Please try again.';
			if (!toast.isActive(message)) {
				toast.error(message, { toastId: message });
			}

			if (strokeId) {
				eraseStroke(strokeId);
			}
			redrawCanvasWithoutErasedStrokes();
		},
		[redrawCanvasWithoutErasedStrokes, eraseStroke],
	);

	const wrapCallback = useCallback(
		(strokeId?: string, onSuccess?: () => void): Callback => {
			return ({ success, error }) => {
				if (!success && error) {
					handleCallbackError(error, strokeId);
					return;
				}
				onSuccess?.();
			};
		},
		[handleCallbackError],
	);

	return { wrapCallback, handleCallbackError };
};
