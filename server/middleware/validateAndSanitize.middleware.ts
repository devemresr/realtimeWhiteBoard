function sanitizeAndDetect(
	obj: any,
	depth: number = 0
): { sanitized: any; hadProhibited: boolean } {
	if (depth > 10) return { sanitized: {}, hadProhibited: false };

	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
		if (typeof obj === 'string') {
			const original = obj;
			const clean = obj.replace(/\$\w+/g, '');
			return {
				sanitized: clean,
				hadProhibited: original !== clean,
			};
		}
		return { sanitized: obj, hadProhibited: false };
	}

	const sanitized: any = {};
	let hadProhibited = false;

	for (const key in obj) {
		let cleanKey = key;

		// Check if key had prohibited operators
		if (key.includes('$')) {
			cleanKey = key.replace(/\$\w*/g, '');
			hadProhibited = true;
		}

		if (!cleanKey || cleanKey.trim() === '') {
			hadProhibited = true;
			continue;
		}

		const result = sanitizeAndDetect(obj[key], depth + 1);
		sanitized[cleanKey] = result.sanitized;

		if (result.hadProhibited) {
			hadProhibited = true;
		}
	}

	return { sanitized, hadProhibited };
}

export default sanitizeAndDetect;
