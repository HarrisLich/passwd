export type Env = {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN?: string;
	SESSION_SECRET: string;
	BETTER_AUTH_URL: string;
	FRONTEND_ORIGIN: string;
	ENVIRONMENT: string;
	/** chrome-extension://<id> for passwd-extension dev — unset in production. */
	EXTENSION_ORIGIN?: string;
};

export function envFromProcess(): Env {
	const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
	const SESSION_SECRET = process.env.SESSION_SECRET;
	if (!TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is required');
	if (!SESSION_SECRET) throw new Error('SESSION_SECRET is required');

	return {
		TURSO_DATABASE_URL,
		TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
		SESSION_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8787',
		FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
		ENVIRONMENT: process.env.ENVIRONMENT ?? 'development',
		EXTENSION_ORIGIN: process.env.EXTENSION_ORIGIN || undefined
	};
}
