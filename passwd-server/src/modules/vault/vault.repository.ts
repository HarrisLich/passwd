import { and, eq } from 'drizzle-orm';
import type { Db } from '../../infra/db/client';
import { itemShares, vaultItems } from '../../infra/db/schema';

export const VaultRepository = {
	async upsert(
		db: Db,
		row: {
			id: string;
			userId: string;
			vaultId: string | null;
			envelopeJson: string;
			cryptoMode: string;
			itemType: string;
			version: number;
			updatedAt: string;
		}
	) {
		await db
			.insert(vaultItems)
			.values({
				id: row.id,
				userId: row.userId,
				vaultId: row.vaultId,
				envelopeJson: row.envelopeJson,
				cryptoMode: row.cryptoMode,
				itemType: row.itemType,
				version: row.version,
				updatedAt: row.updatedAt,
				deletedAt: null
			})
			.onConflictDoUpdate({
				target: [vaultItems.userId, vaultItems.id],
				set: {
					vaultId: row.vaultId,
					envelopeJson: row.envelopeJson,
					cryptoMode: row.cryptoMode,
					itemType: row.itemType,
					version: row.version,
					updatedAt: row.updatedAt,
					deletedAt: null
				}
			});
	},

	async upsertKeyWraps(
		db: Db,
		input: {
			itemId: string;
			itemOwnerId: string;
			vaultId: string;
			grantedBy: string;
			wraps: Array<{
				recipientType: string;
				recipientId: string;
				wrappedItemKey: string;
				accessLevel: string;
				keyVersion: number;
			}>;
		}
	) {
		const now = new Date().toISOString();
		for (const wrap of input.wraps) {
			await db
				.insert(itemShares)
				.values({
					itemId: input.itemId,
					itemOwnerId: input.itemOwnerId,
					vaultId: input.vaultId,
					recipientType: wrap.recipientType,
					recipientId: wrap.recipientId,
					wrappedItemKey: wrap.wrappedItemKey,
					accessLevel: wrap.accessLevel,
					grantedBy: input.grantedBy,
					keyVersion: wrap.keyVersion,
					createdAt: now
				})
				.onConflictDoUpdate({
					target: [
						itemShares.itemOwnerId,
						itemShares.itemId,
						itemShares.recipientType,
						itemShares.recipientId
					],
					set: {
						wrappedItemKey: wrap.wrappedItemKey,
						accessLevel: wrap.accessLevel,
						grantedBy: input.grantedBy,
						keyVersion: wrap.keyVersion,
						vaultId: input.vaultId
					}
				});
		}
	},

	async getById(db: Db, userId: string, id: string) {
		const rows = await db
			.select()
			.from(vaultItems)
			.where(and(eq(vaultItems.userId, userId), eq(vaultItems.id, id)))
			.limit(1);
		return rows[0] ?? null;
	},

	async softDelete(db: Db, userId: string, id: string, deletedAt: string) {
		const existing = await VaultRepository.getById(db, userId, id);
		if (!existing) return null;

		const version = existing.version + 1;
		await db
			.update(vaultItems)
			.set({
				deletedAt,
				updatedAt: deletedAt,
				version
			})
			.where(and(eq(vaultItems.userId, userId), eq(vaultItems.id, id)));

		return { id, version, updatedAt: deletedAt, deletedAt };
	}
};
