import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { AccessDeniedError } from '../../modules/access/access.service';
import { VaultsService } from '../../modules/vaults/vaults.service';

export const vaultsRoutes = new Hono<AppEnv>();

vaultsRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

vaultsRoutes.post('/bootstrap', async (c) => {
	const user = c.get('user')!;
	const vaults = await VaultsService.bootstrapPersonal(c.get('db'), user.id);
	return c.json({ vaults });
});

vaultsRoutes.get('/', async (c) => {
	const user = c.get('user')!;
	const vaults = await VaultsService.listForUser(c.get('db'), user.id);
	return c.json({ vaults });
});

vaultsRoutes.post('/', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	const vault = await VaultsService.create(c.get('db'), user.id, body);
	return c.json(vault);
});

vaultsRoutes.get('/:vaultId/shares', async (c) => {
	const user = c.get('user')!;
	try {
		const shares = await VaultsService.listVaultShares(
			c.get('db'),
			user.id,
			c.req.param('vaultId')
		);
		return c.json({ shares });
	} catch (err) {
		if (err instanceof AccessDeniedError) {
			return c.json({ error: 'forbidden', message: err.message }, 403);
		}
		throw err;
	}
});

vaultsRoutes.post('/:vaultId/shares', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	try {
		const result = await VaultsService.grantVaultShare(
			c.get('db'),
			user.id,
			c.req.param('vaultId'),
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

vaultsRoutes.post('/item-shares', async (c) => {
	const user = c.get('user')!;
	const body = await c.req.json();
	try {
		const result = await VaultsService.grantItemShares(c.get('db'), user.id, body);
		return c.json(result);
	} catch (err) {
		if (err instanceof AccessDeniedError) {
			return c.json({ error: 'forbidden', message: err.message }, 403);
		}
		throw err;
	}
});
