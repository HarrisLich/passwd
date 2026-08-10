/**
 * Temporary diagnostic logging for the save-detection pipeline while tracking
 * down repeated false-positive save prompts. Safe to leave in — cheap, and
 * only ever prints metadata (origin, field roles, prompt mode), never
 * passwords. Remove once the root cause is confirmed fixed.
 */
const PREFIX = '[passwd:save-detect]';

export function logSave(...args: unknown[]): void {
	console.log(PREFIX, ...args);
}

/** Redacts a password to its length only — never log the value itself. */
export function redact(value: string): string {
	return value ? `<${value.length} chars>` : '<empty>';
}
