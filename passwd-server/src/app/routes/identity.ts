import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { IdentityService } from '../../modules/identity/identity.service';

export const identityRoutes = new Hono<AppEnv>();

identityRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

identityRoutes.put('/', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	const result = await IdentityService.upsert(c.get('db'), user.id, body);
	return c.json(result);
});

identityRoutes.get('/me', async (c) => {
	const user = c.get('user')!;
	const bundle = await IdentityService.getIdentityBundle(c.get('db'), user.id);
	if (!bundle) return c.json({ identity: null });
	return c.json({ identity: bundle });
});
