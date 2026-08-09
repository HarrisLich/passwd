import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import type { Env } from '../../core/env';
import * as schema from './schema';

export type Db = LibSQLDatabase<typeof schema>;

export function createLibsqlClient(env: Env): Client {
	return createClient({
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN
	});
}

export function createDb(env: Env): Db {
	return drizzle(createLibsqlClient(env), { schema });
}
