import { NextFunction, Request, Response } from 'express';
function validateData(req: Request, res: Response, next: NextFunction) {
	const route = req.route?.path || req.path;

	console.log('req.path.', req.path, req.route?.path);
	next();
}

export default validateData;
