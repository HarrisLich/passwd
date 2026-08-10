import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Env } from '../../core/env';
import { createDb } from '../db/client';
import { schema } from '../db/schema';

/**
 * Session auth only. The "password" Better Auth hashes must be a client-derived
 * auth secret (K_auth material), never the master password or K_vault.
 */
export function createAuth(env: Env) {
	const db = createDb(env);

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema
		}),
		secret: env.SESSION_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: [
			env.FRONTEND_ORIGIN,
			'http://127.0.0.1:5173',
			'http://localhost:5173',
			...(env.EXTENSION_ORIGIN ? [env.EXTENSION_ORIGIN] : [])
		],
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 16
		},
		user: {
			additionalFields: {
				kdfParams: {
					type: 'string',
					required: true,
					input: true,
					returned: true
				}
			}
		},
		advanced: {
			defaultCookieAttributes: {
				// A chrome-extension:// origin calling this API is cross-site, so
				// SameSite=Lax would silently drop the cookie on fetch/XHR — same problem
				// in production, where passwd-svelte and passwd-server deploy as separate
				// Workers on separate origins (no same-origin Vite proxy trick there).
				// Chrome trusts http://127.0.0.1 as a secure context, so Secure still works
				// without HTTPS in local dev once EXTENSION_ORIGIN is set.
				sameSite: env.EXTENSION_ORIGIN || env.ENVIRONMENT === 'production' ? 'none' : 'lax',
				secure: env.ENVIRONMENT === 'production' || Boolean(env.EXTENSION_ORIGIN),
				httpOnly: true
			}
		}
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = Auth['$Infer']['Session']['user'];
export type Session = Auth['$Infer']['Session']['session'];
