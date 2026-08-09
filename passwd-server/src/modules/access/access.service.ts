import { and, eq, or } from 'drizzle-orm';
import type { Db } from '../../infra/db/client';
import {
	groupMembers,
	itemShares,
	vaultItems,
	vaultShares,
	vaults
} from '../../infra/db/schema';
import { type AccessLevel, hasAccessAtLeast } from './access.types';

export const AccessService = {
	async groupIdsForUser(db: Db, userId: string): Promise<string[]> {
		const rows = await db
			.select({ groupId: groupMembers.groupId })
			.from(groupMembers)
			.where(eq(groupMembers.userId, userId));
		return rows.map((r) => r.groupId);
	},

	async vaultAccessLevel(
		db: Db,
		userId: string,
		vaultId: string
	): Promise<AccessLevel | null> {
		const vault = await db.select().from(vaults).where(eq(vaults.id, vaultId)).limit(1);
		const row = vault[0];
		if (!row) return null;
		if (row.ownerId === userId) return 'owner';

		const groupIds = await AccessService.groupIdsForUser(db, userId);
		const shareConds = [
			and(eq(vaultShares.recipientType, 'user'), eq(vaultShares.recipientId, userId))
		];
		if (groupIds.length) {
			for (const gid of groupIds) {
				shareConds.push(
					and(eq(vaultShares.recipientType, 'group'), eq(vaultShares.recipientId, gid))
				);
			}
		}

		const recipientOr = shareConds.length === 1 ? shareConds[0]! : or(...shareConds);
		const shares = await db
			.select()
			.from(vaultShares)
			.where(and(eq(vaultShares.vaultId, vaultId), recipientOr));

		let best: AccessLevel | null = null;
		for (const s of shares) {
			const level = s.accessLevel as AccessLevel;
			if (!best || hasAccessAtLeast(level, best)) best = level;
		}
		return best;
	},

	async itemAccessLevel(
		db: Db,
		userId: string,
		itemOwnerId: string,
		itemId: string
	): Promise<AccessLevel | null> {
		const itemRows = await db
			.select()
			.from(vaultItems)
			.where(and(eq(vaultItems.userId, itemOwnerId), eq(vaultItems.id, itemId)))
			.limit(1);
		const item = itemRows[0];
		if (!item) return null;
		if (item.userId === userId) return 'owner';

		if (item.vaultId) {
			const vaultLevel = await AccessService.vaultAccessLevel(db, userId, item.vaultId);
			// Vault-level alone is not enough for decryption, but for API writes we still
			// require an item_share. Prefer the item_share level when present.
			void vaultLevel;
		}

		const groupIds = await AccessService.groupIdsForUser(db, userId);
		const shareConds = [
			and(eq(itemShares.recipientType, 'user'), eq(itemShares.recipientId, userId))
		];
		for (const gid of groupIds) {
			shareConds.push(
				and(eq(itemShares.recipientType, 'group'), eq(itemShares.recipientId, gid))
			);
		}

		const recipientOr = shareConds.length === 1 ? shareConds[0]! : or(...shareConds);
		const shares = await db
			.select()
			.from(itemShares)
			.where(
				and(
					eq(itemShares.itemOwnerId, itemOwnerId),
					eq(itemShares.itemId, itemId),
					recipientOr
				)
			);

		let best: AccessLevel | null = null;
		for (const s of shares) {
			const level = s.accessLevel as AccessLevel;
			if (!best || hasAccessAtLeast(level, best)) best = level;
		}
		return best;
	},

	async requireItemAccess(
		db: Db,
		userId: string,
		itemOwnerId: string,
		itemId: string,
		need: AccessLevel
	): Promise<AccessLevel> {
		const have = await AccessService.itemAccessLevel(db, userId, itemOwnerId, itemId);
		if (!have || !hasAccessAtLeast(have, need)) {
			throw new AccessDeniedError(need);
		}
		return have;
	},

	async requireVaultAccess(
		db: Db,
		userId: string,
		vaultId: string,
		need: AccessLevel
	): Promise<AccessLevel> {
		const have = await AccessService.vaultAccessLevel(db, userId, vaultId);
		if (!have || !hasAccessAtLeast(have, need)) {
			throw new AccessDeniedError(need);
		}
		return have;
	}
};

export class AccessDeniedError extends Error {
	constructor(need: AccessLevel) {
		super(`Requires ${need} access`);
		this.name = 'AccessDeniedError';
	}
}
