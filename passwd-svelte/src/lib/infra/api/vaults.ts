import { apiFetch } from '$lib/infra/api/client';
import type { AccessLevel } from '$lib/infra/crypto';

export type VaultSummary = {
	id: string;
	name: string;
	ownerId: string;
	accessLevel: AccessLevel | string;
	createdAt: string;
	updatedAt: string;
};

export type VaultShareRow = {
	recipientType: 'user' | 'group';
	recipientId: string;
	accessLevel: string;
	grantedBy: string;
	createdAt: string;
};

export async function bootstrapVaults(): Promise<VaultSummary[]> {
	const res = await apiFetch('/v1/vaults/bootstrap', { method: 'POST' });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Vault bootstrap failed');
	return (data as { vaults: VaultSummary[] }).vaults;
}

export async function listVaults(): Promise<VaultSummary[]> {
	const res = await apiFetch('/v1/vaults');
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'List vaults failed');
	return (data as { vaults: VaultSummary[] }).vaults;
}

export async function listVaultShares(vaultId: string): Promise<VaultShareRow[]> {
	const res = await apiFetch(`/v1/vaults/${vaultId}/shares`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'List shares failed');
	return (data as { shares: VaultShareRow[] }).shares;
}

export async function grantVaultShare(input: {
	vaultId: string;
	recipientType: 'user' | 'group';
	recipientId: string;
	accessLevel: AccessLevel;
	itemWraps: Array<{
		itemId: string;
		itemOwnerId: string;
		wrappedItemKey: string;
		keyVersion?: number;
	}>;
}): Promise<void> {
	const res = await apiFetch(`/v1/vaults/${input.vaultId}/shares`, {
		method: 'POST',
		body: JSON.stringify({
			recipientType: input.recipientType,
			recipientId: input.recipientId,
			accessLevel: input.accessLevel,
			itemWraps: input.itemWraps
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { message?: string }).message ??
				(data as { error?: string }).error ??
				`Share failed (${res.status})`
		);
	}
}

export async function grantItemShares(input: {
	recipientType: 'user' | 'group';
	recipientId: string;
	accessLevel: AccessLevel;
	wraps: Array<{
		itemId: string;
		itemOwnerId: string;
		vaultId: string;
		wrappedItemKey: string;
		keyVersion?: number;
	}>;
}): Promise<void> {
	const res = await apiFetch('/v1/vaults/item-shares', {
		method: 'POST',
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { message?: string }).message ??
				(data as { error?: string }).error ??
				`Item share failed (${res.status})`
		);
	}
}

export async function listVaultShareRecipients(vaultId: string): Promise<
	Array<{ recipientType: 'user' | 'group'; recipientId: string; accessLevel: string }>
> {
	const res = await apiFetch(`/v1/vault/shares/recipients/${vaultId}`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		if (res.status === 403) return [];
		throw new Error((data as { error?: string }).error ?? 'Recipients fetch failed');
	}
	return (data as { recipients: Array<{ recipientType: 'user' | 'group'; recipientId: string; accessLevel: string }> })
		.recipients;
}
