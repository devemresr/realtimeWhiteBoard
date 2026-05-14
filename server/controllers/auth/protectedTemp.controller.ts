import { Request, Response } from 'express';

export const protectedd = async (req: Request, res: Response) => {
	return res.status(200).json({ success: true, accessToken: req.accessToken });
};
