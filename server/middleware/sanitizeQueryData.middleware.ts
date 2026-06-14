import { Request, Response } from 'express';
import sanitizeAndDetect from './validateAndSanitize.middleware';
import { NestedObject } from '../../shared/types/express';
import logger from '@shared/util/logger';

const sanitizeQueryData = (req: Request, res: Response): boolean => {
	if (
		req.query &&
		typeof req.query === 'object' &&
		Object.entries(req.query).length > 0
	) {
		try {
			logger.debug({ query: req.query }, 'Sanitizing query data');

			const result = sanitizeAndDetect(req.query);

			req.validatedQuery = result.sanitized as NestedObject;

			logger.debug(
				{ sanitized: result.sanitized },
				'Query sanitized successfully',
			);

			if (result.hadProhibited) {
				logger.warn(
					{ ip: req.ip },
					'Sanitized prohibited operators from request',
				);
			}

			return true;
		} catch (error) {
			logger.error({ err: error, ip: req.ip }, 'Failed to sanitize query data');
			return false;
		}
	}
	return true;
};

export default sanitizeQueryData;
