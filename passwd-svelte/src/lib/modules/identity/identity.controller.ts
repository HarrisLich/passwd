import {
	createWrappedIdentity,
	restoreIdentity,
	type BoxKeyPair,
	type VaultEnvelope
} from '$lib/infra/crypto';
import { fetchIdentityBundle, putIdentity } from '$lib/infra/api/identity';
import { bootstrapVaults } from '$lib/infra/api/vaults';
import { setActiveVaultId } from '$lib/stores/vault.svelte';

/** Ensure X25519 identity exists (create on first unlock for legacy accounts). */
export async function ensureIdentity(vaultKey: Uint8Array): Promise<BoxKeyPair> {
	const existing = await fetchIdentityBundle();
	if (existing) {
		return restoreIdentity(
			existing.publicKey,
			existing.encryptedPrivateKey as VaultEnvelope,
			vaultKey
		);
	}

	const created = createWrappedIdentity(vaultKey);
	await putIdentity({
		publicKey: created.publicKey,
		encryptedPrivateKey: created.encryptedPrivateKey,
		fingerprint: created.fingerprint
	});
	return created.keyPair;
}

export async function ensurePersonalVault(): Promise<string> {
	const vaults = await bootstrapVaults();
	const personal = vaults[0];
	if (!personal) throw new Error('Could not bootstrap personal vault');
	setActiveVaultId(personal.id);
	return personal.id;
}
