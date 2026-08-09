import { z } from 'zod';
import type { AccessLevel } from '$lib/infra/crypto';

export const vaultItemPlaintextSchema = z.object({
	title: z.string().min(1).max(200),
	username: z.string().max(500).default(''),
	password: z.string().max(2000).default(''),
	url: z.string().max(2000).default(''),
	notes: z.string().max(10_000).default(''),
	kind: z.enum(['login', 'note']).default('login')
});

export type VaultItemPlaintext = z.infer<typeof vaultItemPlaintextSchema>;

export type DecryptedVaultItem = {
	id: string;
	ownerId: string;
	vaultId: string | null;
	version: number;
	updatedAt: string;
	accessLevel: AccessLevel | string;
	cryptoMode: string;
	/** Cached item key for re-wrap on share/edit (in-memory only). */
	itemKey: Uint8Array | null;
	data: VaultItemPlaintext;
};
