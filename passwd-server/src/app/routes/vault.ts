import { Hono } from 'hono';
import type { AppEnv } from '../../core/app-types';
import { AccessDeniedError, AccessService } from '../../modules/access/access.service';
import { VaultService } from '../../modules/vault/vault.service';
import { VaultsService } from '../../modules/vaults/vaults.service';

export const vaultRoutes = new Hono<AppEnv>();

vaultRoutes.use('*', async (c, next) => {
	if (!c.get('user')) return c.json({ error: 'unauthorized' }, 401);
	await next();
});

vaultRoutes.put('/items/:id', async (c) => {
	const user = c.get('user')!;
	const id = c.req.param('id');
	const body = await c.req.json();
	try {
		const result = await VaultService.upsertItem(c.get('db'), user.id, {
			userId: user.id,
			id,
			...body
		});
		return c.json(result);
	} catch (err) {
		if (err instanceof AccessDeniedError) {
			return c.json({ error: 'forbidden', message: err.message }, 403);
		}
		throw err;
	}
});

vaultRoutes.get('/items/:id', async (c) => {
	const user = c.get('user')!;
	const id = c.req.param('id');
	const result = await VaultService.getItem(c.get('db'), user.id, id);
	if (!result) return c.json({ error: 'not_found' }, 404);
	return c.json(result);
});

vaultRoutes.delete('/items/:id', async (c) => {
	const user = c.get('user')!;
	const id = c.req.param('id');
	const result = await VaultService.deleteItem(c.get('db'), user.id, id);
	if (!result) return c.json({ error: 'not_found' }, 404);
	return c.json(result);
});

vaultRoutes.get('/shares/recipients/:vaultId', async (c) => {
	const user = c.get('user')!;
	const vaultId = c.req.param('vaultId');
	try {
		await AccessService.requireVaultAccess(c.get('db'), user.id, vaultId, 'editor');
		const rows = await VaultsService.listVaultShareRecipientsForWrap(c.get('db'), vaultId);
		return c.json({
			recipients: rows.map((r) => ({
				recipientType: r.recipientType,
				recipientId: r.recipientId,
				accessLevel: r.accessLevel
			}))
		});
	} catch (err) {
		if (err instanceof AccessDeniedError) {
			return c.json({ error: 'forbidden', message: err.message }, 403);
		}
		throw err;
	}
});
