import type { Env } from './env';
import { createAuth } from '../infra/auth/better-auth';
import { createDb } from '../infra/db/client';

/** Wire adapters once (tests / scripts). Request path uses middleware in index.ts. */
export function bootstrap(env: Env) {
	const db = createDb(env);
	const auth = createAuth(env);
	return { db, auth };
}
