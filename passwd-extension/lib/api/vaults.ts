import { apiFetch } from './client';
import type { AccessLevel } from '../crypto';

export type VaultSummary = {
	id: string;
	name: string;
	ownerId: string;
	accessLevel: AccessLevel | string;
	createdAt: string;
	updatedAt: string;
};

export async function bootstrapVaults(): Promise<VaultSummary[]> {
	const res = await apiFetch('/v1/vaults/bootstrap', { method: 'POST' });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Vault bootstrap failed');
	return (data as { vaults: VaultSummary[] }).vaults;
}

/**
 * Recipients already sharing a vault. Only 'user' recipients are wrapped for
 * from the extension (decision: no group-share support here) — 'group'
 * entries are reported but skipped when building key wraps for new items.
 */
export async function listVaultShareRecipients(vaultId: string): Promise<
	Array<{ recipientType: 'user' | 'group'; recipientId: string; accessLevel: string }>
> {
	const res = await apiFetch(`/v1/vault/shares/recipients/${vaultId}`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		if (res.status === 403) return [];
		throw new Error((data as { error?: string }).error ?? 'Recipients fetch failed');
	}
	return (
		data as {
			recipients: Array<{ recipientType: 'user' | 'group'; recipientId: string; accessLevel: string }>;
		}
	).recipients;
}
