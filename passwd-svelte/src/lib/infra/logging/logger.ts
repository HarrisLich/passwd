/** Thin client logger — never log passwords, Secret Key, or K_vault. */
export const logger = {
	info: (...args: unknown[]) => console.info('[passwd]', ...args),
	warn: (...args: unknown[]) => console.warn('[passwd]', ...args),
	error: (...args: unknown[]) => console.error('[passwd]', ...args)
};
