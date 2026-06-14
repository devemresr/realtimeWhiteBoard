import { Request, Response, NextFunction } from 'express';
import sanitizeQueryData from './sanitizeQueryData.middleware';
import sanitize from 'mongo-sanitize';

export const handleSanitization = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	if (req.body && typeof req.body === 'object') {
		req.body = sanitize(req.body);
	}
	if (req.query && typeof req.query === 'object') {
		const success = sanitizeQueryData(req, res); // Modifies existing object instead of
		// reassigning we should be able to do this in the mongo-sanitize library
		// but because of a known issue we cant
		if (!success) {
			return res.status(400).json({ error: 'Invalid request format' });
		}
	}

	if (req.params && typeof req.params === 'object') {
		req.params = sanitize(req.params);
	}
	next();
};
