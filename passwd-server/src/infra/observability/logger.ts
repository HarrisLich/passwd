type LogFields = Record<string, unknown>;

/** Workers-safe structured logger (pino-compatible shape). Avoid Node streams in CF. */
export const logger = {
	info(fields: LogFields | string, msg?: string) {
		console.log(typeof fields === 'string' ? fields : JSON.stringify({ level: 'info', ...fields, msg }));
	},
	warn(fields: LogFields | string, msg?: string) {
		console.warn(typeof fields === 'string' ? fields : JSON.stringify({ level: 'warn', ...fields, msg }));
	},
	error(fields: LogFields | string, msg?: string) {
		console.error(typeof fields === 'string' ? fields : JSON.stringify({ level: 'error', ...fields, msg }));
	}
};
