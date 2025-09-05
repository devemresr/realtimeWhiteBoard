import { Request, Response } from 'express';
import sanitizeAndDetect from '../utils/validateAndSanitize';

const sanitizeQueryData = (req: Request, res: Response): boolean => {
	if (req.query && typeof req.query === 'object') {
		try {
			const result = sanitizeAndDetect(req.query);

			// Clear and reassign query properties
			Object.keys(req.query).forEach((key) => {
				delete req.query[key];
			});
			Object.assign(req.query, result.sanitized);

			if (result.hadProhibited) {
				console.warn(`Sanitized prohibited operators from ${req.ip}`);
			}

			return true; // Success
		} catch (error) {
			return false; // Error occurred
		}
	}
	return true; // No query to sanitize
};

export default sanitizeQueryData;
