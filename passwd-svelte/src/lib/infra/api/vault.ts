import { apiFetch } from '$lib/infra/api/client';
import type { AccessLevel, VaultEnvelope } from '$lib/infra/crypto';

export type SyncItem = {
	id: string;
	ownerId: string;
	vaultId: string | null;
	envelope: VaultEnvelope;
	cryptoMode: 'legacy_vault_key' | 'item_key' | string;
	itemType: string;
	version: number;
	updatedAt: string;
	deletedAt: string | null;
	wrappedItemKey: string | null;
	accessLevel: AccessLevel | string | null;
	shareRecipientType: 'user' | 'group' | null;
	shareRecipientId: string | null;
	keyVersion: number | null;
};

export async function syncVault(since: string | null = null): Promise<{ items: SyncItem[] }> {
	const qs = since ? `?since=${encodeURIComponent(since)}` : '';
	const res = await apiFetch(`/v1/sync${qs}`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string }).error ?? `Sync failed (${res.status})`);
	}
	return data as { items: SyncItem[] };
}

export type KeyWrap = {
	recipientType: 'user' | 'group';
	recipientId: string;
	wrappedItemKey: string;
	accessLevel: AccessLevel;
	keyVersion?: number;
};

export async function upsertVaultItem(input: {
	id: string;
	ownerId?: string;
	vaultId?: string;
	envelope: VaultEnvelope;
	cryptoMode?: 'legacy_vault_key' | 'item_key';
	itemType?: string;
	version: number;
	updatedAt: string;
	keyWraps?: KeyWrap[];
}): Promise<{ id: string; version: number; updatedAt: string }> {
	const res = await apiFetch(`/v1/vault/items/${input.id}`, {
		method: 'PUT',
		body: JSON.stringify({
			userId: input.ownerId,
			vaultId: input.vaultId,
			envelope: input.envelope,
			cryptoMode: input.cryptoMode ?? 'legacy_vault_key',
			itemType: input.itemType ?? 'login',
			version: input.version,
			updatedAt: input.updatedAt,
			keyWraps: input.keyWraps
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { message?: string }).message ??
				(data as { error?: string }).error ??
				`Save failed (${res.status})`
		);
	}
	return data as { id: string; version: number; updatedAt: string };
}

export async function deleteVaultItem(id: string): Promise<void> {
	const res = await apiFetch(`/v1/vault/items/${id}`, { method: 'DELETE' });
	if (!res.ok && res.status !== 404) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string }).error ?? `Delete failed (${res.status})`);
	}
}
