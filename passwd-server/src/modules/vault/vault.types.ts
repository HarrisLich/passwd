import { z } from 'zod';
import { accessLevelSchema, recipientTypeSchema } from '../access/access.types';

/** Opaque envelope — server must not interpret ciphertext contents. */
export const vaultItemUpsertSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
	vaultId: z.string().uuid().optional(),
	envelope: z.object({
		v: z.literal(1),
		alg: z.literal('xchacha20poly1305'),
		nonce: z.string().min(1),
		ciphertext: z.string().min(1)
	}),
	cryptoMode: z.enum(['legacy_vault_key', 'item_key']).default('legacy_vault_key'),
	itemType: z.string().min(1).max(40).default('login'),
	updatedAt: z.string().datetime(),
	version: z.number().int().positive(),
	/** Wrapped item keys for owner + vault-level recipients (required when cryptoMode=item_key). */
	keyWraps: z
		.array(
			z.object({
				recipientType: recipientTypeSchema,
				recipientId: z.string().min(1),
				wrappedItemKey: z.string().min(1),
				accessLevel: accessLevelSchema,
				keyVersion: z.number().int().positive().default(1)
			})
		)
		.optional()
});

export type VaultItemUpsert = z.infer<typeof vaultItemUpsertSchema>;
