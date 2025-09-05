import { NextFunction, Request, Response } from 'express';
function validateData(req: Request, res: Response, next: NextFunction) {
	const route = req.route?.path || req.path;

	next();
}

export default validateData;
