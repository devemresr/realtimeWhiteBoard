import { Schema } from 'joi';

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

type ValidationSchemas<T> = {
	[K in keyof T]?: Schema;
};

export default function validateInput<T extends object>(
	values: T,
	schemas: ValidationSchemas<T>
): ValidationResult<T> {
	const errors: ValidationErrors = {};

	for (const key in schemas) {
		const schema = schemas[key];
		if (!schema) continue;

		const { error } = schema.validate(values[key]);
		if (error) {
			errors[key] = { message: error.message };
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
