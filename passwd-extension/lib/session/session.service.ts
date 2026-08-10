import { fetchKdfParams, fetchMe, signInEmail } from '../api/session';
import { fetchIdentityBundle, putIdentity } from '../api/identity';
import { bootstrapVaults } from '../api/vaults';
import {
	createWrappedIdentity,
	restoreIdentity,
	prepareUnlock,
	wipeBytes,
	type BoxKeyPair,
	type VaultEnvelope
} from '../crypto';
import {
	getUnlockedEmail,
	isVaultUnlocked,
	lockVault,
	setActiveVaultId,
	setVaultSession
} from './session.store';

/** Port of passwd-svelte's identity.controller.ts ensureIdentity — creates the X25519 identity on first unlock. */
async function ensureIdentity(vaultKey: Uint8Array): Promise<BoxKeyPair> {
	const existing = await fetchIdentityBundle();
	if (existing) {
		return restoreIdentity(existing.publicKey, existing.encryptedPrivateKey as VaultEnvelope, vaultKey);
	}
	const created = createWrappedIdentity(vaultKey);
	await putIdentity({
		publicKey: created.publicKey,
		encryptedPrivateKey: created.encryptedPrivateKey,
		fingerprint: created.fingerprint
	});
	return created.keyPair;
}

async function ensurePersonalVault(): Promise<string> {
	const vaults = await bootstrapVaults();
	const personal = vaults[0];
	if (!personal) throw new Error('Could not bootstrap personal vault');
	await setActiveVaultId(personal.id);
	return personal.id;
}

/** Port of passwd-svelte's unlock.controller.ts unlockWithCredentials. */
export async function unlock(input: {
	email: string;
	masterPassword: string;
	secretKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
	const email = input.email.trim().toLowerCase();
	let vaultKey: Uint8Array | undefined;
	try {
		const kdfParams = await fetchKdfParams(email);
		const material = await prepareUnlock(input.masterPassword, input.secretKey, kdfParams);
		vaultKey = material.vaultKey;

		await signInEmail({ email, authPassword: material.authPassword });
		const me = await fetchMe();
		if (!me) throw new Error('Signed in but session cookie missing');

		const identity = await ensureIdentity(material.vaultKey);
		await setVaultSession(email, me.id, material.vaultKey, identity);
		await ensurePersonalVault();
		return { ok: true };
	} catch (err) {
		if (vaultKey) wipeBytes(vaultKey);
		return { ok: false, error: err instanceof Error ? err.message : 'Unlock failed' };
	}
}

export async function lock(): Promise<{ ok: true }> {
	await lockVault();
	return { ok: true };
}

export async function getSessionState(): Promise<{ unlocked: boolean; email: string | null }> {
	return { unlocked: isVaultUnlocked(), email: getUnlockedEmail() };
}
