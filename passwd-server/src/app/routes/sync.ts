import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { SyncService } from '../../modules/sync/sync.service';

export const syncRoutes = new Hono<AppEnv>();

syncRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

syncRoutes.get('/', async (c) => {
	const user = c.get('user')!;
	const since = c.req.query('since') ?? null;
	const result = await SyncService.pullSince(c.get('db'), user.id, since);
	return c.json(result);
});
