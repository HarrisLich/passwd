import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./.data/passwd.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
	schema: './src/infra/db/schema.ts',
	out: './drizzle',
	dialect: 'turso',
	dbCredentials: authToken
		? { url, authToken }
		: { url }
});
