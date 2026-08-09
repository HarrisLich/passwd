import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../infra/db/client';
import { groupMembers, groups } from '../../infra/db/schema';
import { newId } from '../../shared/ids';
import { AccessDeniedError } from '../access/access.service';

const createGroupSchema = z.object({
	name: z.string().min(1).max(120),
	publicKey: z.string().min(40),
	fingerprint: z.string().min(8),
	/** Creator's wrap of the group private key. */
	wrappedGroupPrivateKey: z.string().min(1)
});

const addMemberSchema = z.object({
	userId: z.string().min(1),
	role: z.enum(['member', 'admin']).default('member'),
	wrappedGroupPrivateKey: z.string().min(1)
});

export const GroupsService = {
	async create(db: Db, ownerId: string, input: unknown) {
		const body = createGroupSchema.parse(input);
		const now = new Date().toISOString();
		const id = newId();
		await db.insert(groups).values({
			id,
			name: body.name,
			ownerId,
			publicKey: body.publicKey,
			pubkeyFingerprint: body.fingerprint,
			createdAt: now,
			updatedAt: now
		});
		await db.insert(groupMembers).values({
			groupId: id,
			userId: ownerId,
			role: 'admin',
			wrappedGroupPrivateKey: body.wrappedGroupPrivateKey,
			createdAt: now
		});
		return {
			id,
			name: body.name,
			ownerId,
			publicKey: body.publicKey,
			fingerprint: body.fingerprint,
			createdAt: now
		};
	},

	async listForUser(db: Db, userId: string) {
		const memberships = await db
			.select()
			.from(groupMembers)
			.where(eq(groupMembers.userId, userId));
		const out = [];
		for (const m of memberships) {
			const g = await db.select().from(groups).where(eq(groups.id, m.groupId)).limit(1);
			const group = g[0];
			if (!group) continue;
			out.push({
				id: group.id,
				name: group.name,
				ownerId: group.ownerId,
				publicKey: group.publicKey,
				fingerprint: group.pubkeyFingerprint,
				role: m.role,
				wrappedGroupPrivateKey: m.wrappedGroupPrivateKey
			});
		}
		return out;
	},

	async addMember(db: Db, actorId: string, groupId: string, input: unknown) {
		const body = addMemberSchema.parse(input);
		const membership = await db
			.select()
			.from(groupMembers)
			.where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, actorId)))
			.limit(1);
		const actor = membership[0];
		const groupRows = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		const group = groupRows[0];
		if (!group) throw new AccessDeniedError('manager');
		const canAdmin = group.ownerId === actorId || actor?.role === 'admin';
		if (!canAdmin) throw new AccessDeniedError('manager');

		const now = new Date().toISOString();
		await db
			.insert(groupMembers)
			.values({
				groupId,
				userId: body.userId,
				role: body.role,
				wrappedGroupPrivateKey: body.wrappedGroupPrivateKey,
				createdAt: now
			})
			.onConflictDoUpdate({
				target: [groupMembers.groupId, groupMembers.userId],
				set: {
					role: body.role,
					wrappedGroupPrivateKey: body.wrappedGroupPrivateKey
				}
			});

		return { ok: true as const };
	},

	async getPublic(db: Db, groupId: string) {
		const rows = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		const g = rows[0];
		if (!g) return null;
		return {
			id: g.id,
			name: g.name,
			publicKey: g.publicKey,
			fingerprint: g.pubkeyFingerprint
		};
	}
};
