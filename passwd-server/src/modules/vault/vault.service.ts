import type { Db } from '../../infra/db/client';
import { AccessDeniedError, AccessService } from '../access/access.service';
import { VaultRepository } from './vault.repository';
import { vaultItemUpsertSchema } from './vault.types';

export const VaultService = {
	async upsertItem(db: Db, actorId: string, input: unknown) {
		const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
		const body = vaultItemUpsertSchema.parse({
			...raw,
			userId: typeof raw.userId === 'string' ? raw.userId : actorId
		});
		const ownerId = body.userId;
		const existing = await VaultRepository.getById(db, ownerId, body.id);

		if (ownerId === actorId) {
			if (body.vaultId && !existing) {
				const vaultLevel = await AccessService.vaultAccessLevel(db, actorId, body.vaultId);
				if (!vaultLevel || vaultLevel === 'viewer') {
					throw new AccessDeniedError('editor');
				}
			}
		} else {
			await AccessService.requireItemAccess(db, actorId, ownerId, body.id, 'editor');
		}

		if (body.cryptoMode === 'item_key') {
			if (!body.vaultId) throw new Error('vaultId required for item_key mode');
			if (!existing && !body.keyWraps?.length) {
				throw new Error('keyWraps required for item_key mode');
			}
		}

		await VaultRepository.upsert(db, {
			id: body.id,
			userId: ownerId,
			vaultId: body.vaultId ?? null,
			envelopeJson: JSON.stringify(body.envelope),
			cryptoMode: body.cryptoMode,
			itemType: body.itemType,
			version: body.version,
			updatedAt: body.updatedAt
		});

		if (body.vaultId && body.keyWraps?.length) {
			await VaultRepository.upsertKeyWraps(db, {
				itemId: body.id,
				itemOwnerId: ownerId,
				vaultId: body.vaultId,
				grantedBy: actorId,
				wraps: body.keyWraps
			});
		}

		return {
			id: body.id,
			version: body.version,
			updatedAt: body.updatedAt,
			vaultId: body.vaultId ?? null,
			cryptoMode: body.cryptoMode
		};
	},

	async getItem(db: Db, userId: string, id: string) {
		const row = await VaultRepository.getById(db, userId, id);
		if (!row || row.deletedAt) return null;
		return {
			id: row.id,
			vaultId: row.vaultId,
			envelope: JSON.parse(row.envelopeJson),
			cryptoMode: row.cryptoMode,
			version: row.version,
			updatedAt: row.updatedAt
		};
	},

	async deleteItem(db: Db, userId: string, id: string) {
		const existing = await VaultRepository.getById(db, userId, id);
		if (!existing) return null;
		const deletedAt = new Date().toISOString();
		const result = await VaultRepository.softDelete(db, existing.userId, id, deletedAt);
		if (!result) return null;
		return result;
	}
};
