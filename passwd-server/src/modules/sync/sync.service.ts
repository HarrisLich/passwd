import { and, eq, gt, inArray, or } from 'drizzle-orm';
import type { Db } from '../../infra/db/client';
import { groupMembers, itemShares, vaultItems } from '../../infra/db/schema';

export const SyncService = {
	async pullSince(db: Db, userId: string, since: string | null) {
		const owned = since
			? await db
					.select()
					.from(vaultItems)
					.where(and(eq(vaultItems.userId, userId), gt(vaultItems.updatedAt, since)))
			: await db.select().from(vaultItems).where(eq(vaultItems.userId, userId));

		const memberships = await db
			.select({ groupId: groupMembers.groupId })
			.from(groupMembers)
			.where(eq(groupMembers.userId, userId));
		const groupIds = memberships.map((m) => m.groupId);

		const recipientFilter =
			groupIds.length === 0
				? and(eq(itemShares.recipientType, 'user'), eq(itemShares.recipientId, userId))
				: or(
						and(eq(itemShares.recipientType, 'user'), eq(itemShares.recipientId, userId)),
						and(
							eq(itemShares.recipientType, 'group'),
							inArray(itemShares.recipientId, groupIds)
						)
					);

		const shares = await db.select().from(itemShares).where(recipientFilter!);

		const sharedKeys = new Map<string, (typeof shares)[number]>();
		for (const s of shares) {
			const key = `${s.itemOwnerId}:${s.itemId}`;
			const prev = sharedKeys.get(key);
			// Prefer a direct user wrap over a group wrap when both exist.
			if (!prev || (prev.recipientType === 'group' && s.recipientType === 'user')) {
				sharedKeys.set(key, s);
			}
		}

		const sharedItems: typeof owned = [];
		for (const s of sharedKeys.values()) {
			if (s.itemOwnerId === userId) continue;
			const rows = await db
				.select()
				.from(vaultItems)
				.where(and(eq(vaultItems.userId, s.itemOwnerId), eq(vaultItems.id, s.itemId)))
				.limit(1);
			const row = rows[0];
			if (!row) continue;
			if (since && row.updatedAt <= since) continue;
			sharedItems.push(row);
		}

		const byKey = new Map<string, (typeof owned)[number]>();
		for (const row of [...owned, ...sharedItems]) {
			byKey.set(`${row.userId}:${row.id}`, row);
		}

		const items = [...byKey.values()].map((row) => {
			const share = sharedKeys.get(`${row.userId}:${row.id}`);
			const isOwner = row.userId === userId;
			return {
				id: row.id,
				ownerId: row.userId,
				vaultId: row.vaultId,
				envelope: JSON.parse(row.envelopeJson),
				cryptoMode: row.cryptoMode,
				itemType: row.itemType,
				version: row.version,
				updatedAt: row.updatedAt,
				deletedAt: row.deletedAt,
				wrappedItemKey: share?.wrappedItemKey ?? null,
				accessLevel: isOwner ? 'owner' : (share?.accessLevel ?? null),
				shareRecipientType: share?.recipientType ?? (isOwner ? 'user' : null),
				shareRecipientId: share?.recipientId ?? (isOwner ? userId : null),
				keyVersion: share?.keyVersion ?? null
			};
		});

		return { since, items };
	}
};
