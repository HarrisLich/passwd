import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { IdentityService } from '../../modules/identity/identity.service';

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

usersRoutes.get('/lookup', async (c) => {
	const email = c.req.query('email');
	if (!email) return c.json({ error: 'email_required' }, 400);
	const found = await IdentityService.getPublicByEmail(c.get('db'), email);
	if (!found) return c.json({ error: 'not_found' }, 404);
	return c.json(found);
});

usersRoutes.get('/:userId/public', async (c) => {
	const found = await IdentityService.getPublicById(c.get('db'), c.req.param('userId'));
	if (!found) return c.json({ error: 'not_found' }, 404);
	return c.json(found);
});
