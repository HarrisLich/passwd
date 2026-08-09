import { prepareSignup, wipeBytes } from '$lib/infra/crypto';
import { fetchMe, signUpEmail } from '$lib/infra/auth/session';
import { ensureIdentity, ensurePersonalVault } from '$lib/modules/identity/identity.controller';
import { setVaultSession } from '$lib/stores/vault.svelte';

const KDF_CACHE_KEY = 'passwd.kdfParams.v1';

export function cacheKdfParams(email: string, kdfParamsJson: string) {
	if (typeof localStorage === 'undefined') return;
	const all = JSON.parse(localStorage.getItem(KDF_CACHE_KEY) ?? '{}') as Record<string, string>;
	all[email.toLowerCase()] = kdfParamsJson;
	localStorage.setItem(KDF_CACHE_KEY, JSON.stringify(all));
}

export function readCachedKdfParams(email: string): unknown | null {
	if (typeof localStorage === 'undefined') return null;
	const all = JSON.parse(localStorage.getItem(KDF_CACHE_KEY) ?? '{}') as Record<string, string>;
	const raw = all[email.toLowerCase()];
	return raw ? JSON.parse(raw) : null;
}

export async function registerVaultAccount(input: {
	email: string;
	masterPassword: string;
	name?: string;
}) {
	const email = input.email.trim().toLowerCase();
	const material = await prepareSignup(input.masterPassword);

	try {
		await signUpEmail({
			email,
			authPassword: material.authPassword,
			name: input.name?.trim() || email.split('@')[0] || 'Vault',
			kdfParams: material.kdfParams
		});

		const me = await fetchMe();
		if (!me) {
			throw new Error('Signed up but session cookie missing — use http://127.0.0.1:5173');
		}

		const identity = await ensureIdentity(material.vaultKey);
		setVaultSession(email, me.id, material.vaultKey, identity);
		await ensurePersonalVault();
	} catch (err) {
		wipeBytes(material.vaultKey);
		throw err;
	}

	cacheKdfParams(email, JSON.stringify(material.kdfParams));

	return {
		email,
		secretKey: material.secretKey,
		kdfParams: material.kdfParams
	};
}
