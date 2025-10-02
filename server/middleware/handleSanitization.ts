import { Request, Response, NextFunction } from 'express';
import sanitizeQueryData from './sanitizeQueryData';
import sanitize from 'mongo-sanitize';

export const handleSanitization = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (req.body && typeof req.body === 'object') {
		console.log('req.body before sanitization', req.body);
		req.body = sanitize(req.body);
		console.log('req.body after sanitization', req.body);
	}
	if (req.query && typeof req.query === 'object') {
		console.log('req.query', req.query);
		const success = sanitizeQueryData(req, res); // Modifies existing object instead of reassigning we should be able to do this in the mongo-sanitize library but because of a known issue we cant
		if (!success) {
			return res.status(400).json({ error: 'Invalid request format' });
		}
		console.log('req.query', req.query);
	}

	if (req.params && typeof req.params === 'object') {
		console.log('req.params before sanitization', req.params);
		req.params = sanitize(req.params);
		console.log('req.params after sanitization', req.params);
	}
	next();
};
