import { Request, Response } from 'express';
import sanitizeAndDetect from '../utils/validateAndSanitize';
import { NestedObject } from '../../shared/types/express';

const sanitizeQueryData = (req: Request, res: Response): boolean => {
	if (req.query && typeof req.query === 'object') {
		try {
			console.log('reqquey in the sanitization func :', req.query);
			const result = sanitizeAndDetect(req.query);
			console.log('result :', result);

			req.validatedQuery = result.sanitized as NestedObject;
			console.log('result.sanitized', result.sanitized);
			console.log('after the assining req.query:', req.validatedQuery);

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
