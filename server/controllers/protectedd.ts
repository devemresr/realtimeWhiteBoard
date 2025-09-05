import Joi from 'joi';

import { Request, Response } from 'express';

const protectedd = async (req: Request, res: Response) => {
	console.log(
		'req.accessToken in protected',
		req.accessToken,
		'req.tokenExpired',
		req.tokenRefreshNeeded
	);

	const validationMessages = {
		email: {
			'string.email': 'validationErrors.email.invalid',
			'string.empty': 'validationErrors.email.missing',
			'any.req': 'validationErrors.email.required',
		},
	};

	const emailRules = Joi.string()
		.email()
		.required()
		.max(2)
		.messages(validationMessages.email);

	// Test different inputs to see which error types trigger
	const testCases = [
		{ input: undefined, description: 'undefined value' },
		{ input: null, description: 'null value' },
		{ input: '', description: 'empty string' },
		{ input: 'notanemail', description: 'invalid email format' },
		{ input: 'test@', description: 'incomplete email' },
		{ input: 'valid@email.com', description: 'valid email' },
	];

	console.log('=== Joi Error Type Demonstration ===\n');

	testCases.forEach(({ input, description }) => {
		console.log('input', input);

		const { error } = emailRules.validate(input);

		if (error) {
			console.log('the error itself:', error);

			const errorType = error.details[0].type;
			const errorMessage = error.details[0].message;

			console.log(`Input: ${JSON.stringify(input)} (${description})`);
			console.log(`Error Type: "${errorType}"`);
			console.log(`Custom Message: "${errorMessage}"`);
			console.log('---');
		} else {
			console.log(`Input: ${JSON.stringify(input)} (${description}) ✅ VALID`);
			console.log('---');
		}
	});

	return res.status(200).json({
		message: 'succesfull protected call',
		accessToken: req.accessToken,
	});
};

export default protectedd;
