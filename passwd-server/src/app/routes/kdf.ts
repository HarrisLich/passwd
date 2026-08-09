import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { user } from '../../infra/db/schema';

/**
 * Public KDF params (salts) by email — required before session login.
 * Salts are not secret; responses avoid confirming emails when missing.
 */
export const kdfRoutes = new Hono<AppEnv>();

kdfRoutes.get('/params', async (c) => {
	const email = c.req.query('email')?.trim().toLowerCase();
	if (!email) return c.json({ error: 'email_required' }, 400);

	const rows = await c
		.get('db')
		.select({ kdfParams: user.kdfParams })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);

	const row = rows[0];
	if (!row) return c.json({ error: 'not_found' }, 404);
	return c.json({ kdfParams: row.kdfParams });
});
