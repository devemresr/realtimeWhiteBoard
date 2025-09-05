import { Schema } from 'joi';
import { GenericObject } from '../types/basicTypes';

interface ValidationError {
	message: string;
}

interface ValidationErrors {
	[key: string]: ValidationError;
}

interface ValidationSuccess<T> {
	success: true;
	data: T;
}

interface ValidationFailure {
	success: false;
	errors: ValidationErrors;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

interface ValidationSchemas {
	[key: string]: Schema;
}

export default function validateInput<T extends GenericObject>(
	values: T,
	schemas: ValidationSchemas
): ValidationResult<T> {
	const errors: ValidationErrors = {};

	for (const [key, schema] of Object.entries(schemas)) {
		const { error }: { error?: any } = schema.validate(values[key]);
		if (error) {
			errors[key] = { message: error.details[0].message };
		}
	}

	if (Object.keys(errors).length > 0) {
		return {
			success: false,
			errors,
		};
	}

	return {
		success: true,
		data: values,
	};
}
