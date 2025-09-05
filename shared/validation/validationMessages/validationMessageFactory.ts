type ErrorMessageConfig = {
	errorMessageObject?: string;
	fieldName: string;
	errorMessageKey: string;
};

type Options = {
	includedFields?: Record<string, ErrorMessageConfig>;
	excludedFields?: string[];
	errorPrefix?: string;
};

const createTheFields = (
	options: Options = {},
	basicFields: Record<string, string>,
	errorPrefix: string
) => {
	const { includedFields = {}, excludedFields = [] } = options;

	const filtered =
		excludedFields?.reduce(
			(acc, key) => {
				delete acc[key];
				return acc;
			},
			{ ...basicFields }
		) ?? basicFields;

	const customFields = Object.fromEntries(
		Object.entries(includedFields ?? {}).map(([key, config]) => [
			key,
			`${config.errorMessageObject ?? errorPrefix}.${config.fieldName}.${config.errorMessageKey}`,
		])
	);

	return {
		...filtered,
		...customFields,
	};
};

export const createFieldMessages = {
	text: (
		fieldName: string,
		options: Options = {},
		errorPrefix: string = 'validationErrors'
	) => {
		const basicFields = {
			'string.max': `${errorPrefix}.${fieldName}.tooLong`,
			'string.min': `${errorPrefix}.${fieldName}.tooShort`,
			'string.empty': `${errorPrefix}.${fieldName}.missing`,
			'any.required': `${errorPrefix}.${fieldName}.required`,
		};

		return createTheFields(options, basicFields, errorPrefix);
	},

	email: (
		fieldName: string,
		options: Options = {},
		errorPrefix: string = 'validationErrors'
	) => {
		const basicFields = {
			'string.empty': `${errorPrefix}.${fieldName}.missing`,
			'string.email': `${errorPrefix}.${fieldName}.invalidEmail`,
			'any.required': `${errorPrefix}.${fieldName}.required`,
		};

		return createTheFields(options, basicFields, errorPrefix);
	},

	number: (
		fieldName: string,
		options: Options = {},
		errorPrefix: string = 'validationErrors'
	) => {
		const basicFields = {
			'number.base': `${errorPrefix}.${fieldName}.mustBeNumber`,
			'number.min': `${errorPrefix}.${fieldName}.tooSmall`,
			'number.max': `${errorPrefix}.${fieldName}.tooLarge`,
			'any.required': `${errorPrefix}.${fieldName}.required`,
		};

		return createTheFields(options, basicFields, errorPrefix);
	},
};
