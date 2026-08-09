import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { AccessDeniedError } from '../../modules/access/access.service';
import { GroupsService } from '../../modules/groups/groups.service';

export const groupsRoutes = new Hono<AppEnv>();

groupsRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

groupsRoutes.get('/', async (c) => {
	const user = c.get('user')!;
	const groups = await GroupsService.listForUser(c.get('db'), user.id);
	return c.json({ groups });
});

groupsRoutes.post('/', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	const group = await GroupsService.create(c.get('db'), user.id, body);
	return c.json(group);
});

groupsRoutes.get('/:groupId', async (c) => {
	const group = await GroupsService.getPublic(c.get('db'), c.req.param('groupId'));
	if (!group) return c.json({ error: 'not_found' }, 404);
	return c.json(group);
});

groupsRoutes.post('/:groupId/members', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	try {
		const result = await GroupsService.addMember(
			c.get('db'),
			user.id,
			c.req.param('groupId'),
			body
		);
		return c.json(result);
	} catch (err) {
		if (err instanceof AccessDeniedError) {
			return c.json({ error: 'forbidden', message: err.message }, 403);
		}
		throw err;
	}
});
