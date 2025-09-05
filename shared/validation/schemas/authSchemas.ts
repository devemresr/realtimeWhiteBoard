import { StringObject } from '../../types/basicTypes';
import { createFieldMessages } from '../validationMessages/validationMessageFactory';
import Joi from 'joi';

const passwordMessages: StringObject = createFieldMessages.text('password');

const passwordRules = Joi.string()
	// Must have at least 2 of: lowercase, uppercase, or digit
	.pattern(
		new RegExp(
			'^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*\\d)|(?=.*[A-Z])(?=.*\\d)'
		)
	)
	.message('validationErrors.password.basicRequirement')
	// Disallow whitespace
	.pattern(new RegExp('^(?!.*\\s)'))
	.message('validationErrors.password.noWhitespace')
	// Only allow specific characters
	.pattern(
		new RegExp(
			'^[a-zA-Z\\d~!?@#$%^&*_\\-\\+\\(\\)\\[\\]\\{\\}><\\/\\\\|"\'\\.,:;]+$'
		)
	)
	.message('validationErrors.password.latinOnly')
	.min(8)
	.max(24)
	.required()
	.messages(passwordMessages);

const emailMessages: StringObject = createFieldMessages.email('email', {
	includedFields: {
		'string.max': {
			fieldName: 'email',
			errorMessageKey: 'tooLong',
		},
	},
});

const emailRules = Joi.string()
	.email()
	.max(254)
	.required()
	.messages(emailMessages);

export const loginSchemas = {
	email: emailRules,
	password: passwordRules,
};
