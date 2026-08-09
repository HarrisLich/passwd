import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../infra/db/client';
import { itemShares, vaultItems, vaultShares, vaults } from '../../infra/db/schema';
import { newId } from '../../shared/ids';
import { AccessDeniedError, AccessService } from '../access/access.service';
import { accessLevelSchema, recipientTypeSchema } from '../access/access.types';

const createVaultSchema = z.object({
	name: z.string().min(1).max(120),
	id: z.string().uuid().optional()
});

const shareWrapSchema = z.object({
	itemId: z.string().min(1),
	itemOwnerId: z.string().min(1),
	wrappedItemKey: z.string().min(1),
	keyVersion: z.number().int().positive().default(1)
});

const grantVaultShareSchema = z.object({
	recipientType: recipientTypeSchema,
	recipientId: z.string().min(1),
	accessLevel: accessLevelSchema,
	/** Client-precomputed wraps for every current item (fan-out). */
	itemWraps: z.array(shareWrapSchema).default([])
});

export const VaultsService = {
	async bootstrapPersonal(db: Db, userId: string) {
		const existing = await db.select().from(vaults).where(eq(vaults.ownerId, userId));
		if (existing.length) {
			return existing.map((v) => ({
				id: v.id,
				name: v.name,
				ownerId: v.ownerId,
				accessLevel: 'owner' as const,
				createdAt: v.createdAt,
				updatedAt: v.updatedAt
			}));
		}

		const now = new Date().toISOString();
		const id = newId();
		await db.insert(vaults).values({
			id,
			name: 'Personal',
			ownerId: userId,
			createdAt: now,
			updatedAt: now
		});

		// Attach legacy items (no vaultId) to personal vault.
		await db
			.update(vaultItems)
			.set({ vaultId: id })
			.where(and(eq(vaultItems.userId, userId)));

		return [
			{
				id,
				name: 'Personal',
				ownerId: userId,
				accessLevel: 'owner' as const,
				createdAt: now,
				updatedAt: now
			}
		];
	},

	async create(db: Db, userId: string, input: unknown) {
		const body = createVaultSchema.parse(input);
		const now = new Date().toISOString();
		const id = body.id ?? newId();
		await db.insert(vaults).values({
			id,
			name: body.name,
			ownerId: userId,
			createdAt: now,
			updatedAt: now
		});
		return { id, name: body.name, ownerId: userId, accessLevel: 'owner' as const, createdAt: now, updatedAt: now };
	},

	async listForUser(db: Db, userId: string) {
		const owned = await db.select().from(vaults).where(eq(vaults.ownerId, userId));
		const groupIds = await AccessService.groupIdsForUser(db, userId);

		const shareConds = [
			and(eq(vaultShares.recipientType, 'user'), eq(vaultShares.recipientId, userId))
		];
		for (const gid of groupIds) {
			shareConds.push(
				and(eq(vaultShares.recipientType, 'group'), eq(vaultShares.recipientId, gid))
			);
		}

		const sharedRows =
			shareConds.length === 1
				? await db.select().from(vaultShares).where(shareConds[0]!)
				: await db.select().from(vaultShares).where(or(...shareConds));

		const sharedVaultIds = [...new Set(sharedRows.map((s) => s.vaultId))];
		const sharedVaults =
			sharedVaultIds.length === 0
				? []
				: await db
						.select()
						.from(vaults)
						.where(or(...sharedVaultIds.map((id) => eq(vaults.id, id))));

		const byId = new Map<
			string,
			{
				id: string;
				name: string;
				ownerId: string;
				accessLevel: string;
				createdAt: string;
				updatedAt: string;
			}
		>();

		for (const v of owned) {
			byId.set(v.id, {
				id: v.id,
				name: v.name,
				ownerId: v.ownerId,
				accessLevel: 'owner',
				createdAt: v.createdAt,
				updatedAt: v.updatedAt
			});
		}

		for (const s of sharedRows) {
			const v = sharedVaults.find((x) => x.id === s.vaultId);
			if (!v) continue;
			const prev = byId.get(v.id);
			if (!prev) {
				byId.set(v.id, {
					id: v.id,
					name: v.name,
					ownerId: v.ownerId,
					accessLevel: s.accessLevel,
					createdAt: v.createdAt,
					updatedAt: v.updatedAt
				});
			}
		}

		return [...byId.values()];
	},

	async listVaultShares(db: Db, userId: string, vaultId: string) {
		await AccessService.requireVaultAccess(db, userId, vaultId, 'manager');
		const rows = await db.select().from(vaultShares).where(eq(vaultShares.vaultId, vaultId));
		return rows.map((r) => ({
			recipientType: r.recipientType,
			recipientId: r.recipientId,
			accessLevel: r.accessLevel,
			grantedBy: r.grantedBy,
			createdAt: r.createdAt
		}));
	},

	async grantVaultShare(db: Db, granterId: string, vaultId: string, input: unknown) {
		await AccessService.requireVaultAccess(db, granterId, vaultId, 'manager');
		const body = grantVaultShareSchema.parse(input);
		const now = new Date().toISOString();

		await db
			.insert(vaultShares)
			.values({
				vaultId,
				recipientType: body.recipientType,
				recipientId: body.recipientId,
				accessLevel: body.accessLevel,
				grantedBy: granterId,
				createdAt: now
			})
			.onConflictDoUpdate({
				target: [vaultShares.vaultId, vaultShares.recipientType, vaultShares.recipientId],
				set: {
					accessLevel: body.accessLevel,
					grantedBy: granterId
				}
			});

		for (const wrap of body.itemWraps) {
			await db
				.insert(itemShares)
				.values({
					itemId: wrap.itemId,
					itemOwnerId: wrap.itemOwnerId,
					vaultId,
					recipientType: body.recipientType,
					recipientId: body.recipientId,
					wrappedItemKey: wrap.wrappedItemKey,
					accessLevel: body.accessLevel,
					grantedBy: granterId,
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
						accessLevel: body.accessLevel,
						grantedBy: granterId,
						keyVersion: wrap.keyVersion
					}
				});
		}

		return { ok: true as const, wraps: body.itemWraps.length };
	},

	async grantItemShares(
		db: Db,
		granterId: string,
		input: unknown
	): Promise<{ ok: true; count: number }> {
		const schema = z.object({
			recipientType: recipientTypeSchema,
			recipientId: z.string().min(1),
			accessLevel: accessLevelSchema,
			wraps: z
				.array(
					z.object({
						itemId: z.string().min(1),
						itemOwnerId: z.string().min(1),
						vaultId: z.string().min(1),
						wrappedItemKey: z.string().min(1),
						keyVersion: z.number().int().positive().default(1)
					})
				)
				.min(1)
		});
		const body = schema.parse(input);
		const now = new Date().toISOString();

		for (const wrap of body.wraps) {
			const level = await AccessService.itemAccessLevel(
				db,
				granterId,
				wrap.itemOwnerId,
				wrap.itemId
			);
			const vaultLevel = await AccessService.vaultAccessLevel(db, granterId, wrap.vaultId);
			const canManage =
				(level && (level === 'manager' || level === 'owner')) ||
				(vaultLevel && (vaultLevel === 'manager' || vaultLevel === 'owner')) ||
				wrap.itemOwnerId === granterId;
			if (!canManage) throw new AccessDeniedError('manager');

			await db
				.insert(itemShares)
				.values({
					itemId: wrap.itemId,
					itemOwnerId: wrap.itemOwnerId,
					vaultId: wrap.vaultId,
					recipientType: body.recipientType,
					recipientId: body.recipientId,
					wrappedItemKey: wrap.wrappedItemKey,
					accessLevel: body.accessLevel,
					grantedBy: granterId,
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
						accessLevel: body.accessLevel,
						grantedBy: granterId,
						keyVersion: wrap.keyVersion
					}
				});
		}

		return { ok: true, count: body.wraps.length };
	},

	async listVaultShareRecipientsForWrap(db: Db, vaultId: string) {
		return db.select().from(vaultShares).where(eq(vaultShares.vaultId, vaultId));
	}
};
