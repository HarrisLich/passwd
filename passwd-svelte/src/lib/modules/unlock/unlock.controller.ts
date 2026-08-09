import { prepareUnlock, wipeBytes } from '$lib/infra/crypto';
import { fetchKdfParams, fetchMe, signInEmail } from '$lib/infra/auth/session';
import { ensureIdentity, ensurePersonalVault } from '$lib/modules/identity/identity.controller';
import { setVaultSession } from '$lib/stores/vault.svelte';
import { readCachedKdfParams } from '$lib/modules/auth/register';

export async function unlockWithCredentials(input: {
	email: string;
	masterPassword: string;
	secretKey: string;
}) {
	const email = input.email.trim().toLowerCase();
	let kdfParams = readCachedKdfParams(email);
	if (!kdfParams) {
		kdfParams = await fetchKdfParams(email);
	}

	const material = await prepareUnlock(input.masterPassword, input.secretKey, kdfParams);

	try {
		await signInEmail({ email, authPassword: material.authPassword });
		const me = await fetchMe();
		if (!me) throw new Error('Signed in but session cookie missing — use http://127.0.0.1:5173');

		const identity = await ensureIdentity(material.vaultKey);
		setVaultSession(email, me.id, material.vaultKey, identity);
		await ensurePersonalVault();
	} catch (err) {
		wipeBytes(material.vaultKey);
		throw err;
	}

	return { email };
}
