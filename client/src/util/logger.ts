interface LoggerOptions {
	env?: string;
	verbose?: boolean;
}

type LogLevel = 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
	private env: string;
	private enabled: boolean;
	private verbose: boolean;

	constructor(options: LoggerOptions = {}) {
		this.env =
			options.env || process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
		this.enabled = this.env === 'development' || this.env === 'dev';
		this.verbose = options.verbose !== undefined ? options.verbose : true;
	}

	// Get caller file and line number
	private getCallerInfo(): string {
		if (!this.verbose) return '';

		const err = new Error();
		const stack = err.stack?.split('\n');

		if (!stack) return '';

		// Stack trace format: "at functionName (file:line:column)"
		const callerLine = stack[4] || stack[3] || stack[2];

		// Extract function name
		const functionMatch = callerLine.match(/at\s+(\S+)\s+\(/);

		const functionName = functionMatch
			? functionMatch[1].substring(
					functionMatch[1].indexOf('.') + 1,
					functionMatch[1].length
				)
			: 'anonymous';

		const match =
			callerLine.match(/\((.+):(\d+):(\d+)\)/) ||
			callerLine.match(/at (.+):(\d+):(\d+)/);

		if (match) {
			const filePath = match[1];
			const fileName = filePath.split('/').pop() || filePath;
			const lineNumber = match[2];
			return `[${fileName}:${lineNumber} ${functionName}]`;
		}

		return '';
	}

	// Format log message with caller info
	private formatMessage(level: LogLevel, ...args: any[]): any[] {
		const callerInfo = this.getCallerInfo();
		const timestamp = new Date().toISOString();
		const prefix = this.verbose
			? `[${timestamp}] [${level}] ${callerInfo}`
			: `[${level}]`;

		return [prefix, ...args];
	}

	public log(...args: any[]): void {
		if (!this.enabled) return;
		console.log(...this.formatMessage('LOG', ...args));
	}

	public info(...args: any[]): void {
		if (!this.enabled) return;
		console.info(...this.formatMessage('INFO', ...args));
	}

	public warn(...args: any[]): void {
		if (!this.enabled) return;
		console.warn(...this.formatMessage('WARN', ...args));
	}

	public error(...args: any[]): void {
		if (!this.enabled) return;
		console.error(...this.formatMessage('ERROR', ...args));
	}

	public debug(...args: any[]): void {
		if (!this.enabled) return;
		// Use console.log instead of console.debug to avoid dealing browser filtering
		console.log(...this.formatMessage('DEBUG', ...args));
	}
}

// Singleton instance
const logger = new Logger({ verbose: true });

export default logger;
export { Logger };
export type { LoggerOptions };
