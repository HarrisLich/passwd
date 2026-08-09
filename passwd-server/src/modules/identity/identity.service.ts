import { eq } from 'drizzle-orm';
import type { Db } from '../../infra/db/client';
import { user } from '../../infra/db/schema';
import { z } from 'zod';

const identityUpsertSchema = z.object({
	publicKey: z.string().min(40),
	encryptedPrivateKey: z.object({
		v: z.literal(1),
		alg: z.literal('xchacha20poly1305'),
		nonce: z.string().min(1),
		ciphertext: z.string().min(1)
	}),
	fingerprint: z.string().min(8).max(64)
});

export const IdentityService = {
	async upsert(db: Db, userId: string, input: unknown) {
		const body = identityUpsertSchema.parse(input);
		await db
			.update(user)
			.set({
				publicKey: body.publicKey,
				encryptedPrivateKey: JSON.stringify(body.encryptedPrivateKey),
				pubkeyFingerprint: body.fingerprint
			})
			.where(eq(user.id, userId));

		return {
			publicKey: body.publicKey,
			fingerprint: body.fingerprint
		};
	},

	async getPublicByEmail(db: Db, email: string) {
		const rows = await db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				publicKey: user.publicKey,
				fingerprint: user.pubkeyFingerprint
			})
			.from(user)
			.where(eq(user.email, email.trim().toLowerCase()))
			.limit(1);
		const row = rows[0];
		if (!row || !row.publicKey) return null;
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			publicKey: row.publicKey,
			fingerprint: row.fingerprint
		};
	},

	async getIdentityBundle(db: Db, userId: string) {
		const rows = await db
			.select({
				publicKey: user.publicKey,
				encryptedPrivateKey: user.encryptedPrivateKey,
				fingerprint: user.pubkeyFingerprint
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		const row = rows[0];
		if (!row?.publicKey || !row.encryptedPrivateKey) return null;
		return {
			publicKey: row.publicKey,
			encryptedPrivateKey: JSON.parse(row.encryptedPrivateKey),
			fingerprint: row.fingerprint
		};
	},

	async getPublicById(db: Db, userId: string) {
		const rows = await db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				publicKey: user.publicKey,
				fingerprint: user.pubkeyFingerprint
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		const row = rows[0];
		if (!row?.publicKey) return null;
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			publicKey: row.publicKey,
			fingerprint: row.fingerprint
		};
	}
};
