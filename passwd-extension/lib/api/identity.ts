import { apiFetch } from './client';
import type { VaultEnvelope } from '../crypto';

export type PublicUser = {
	id: string;
	email: string;
	name: string;
	publicKey: string;
	fingerprint: string | null;
};

export type IdentityBundle = {
	publicKey: string;
	encryptedPrivateKey: VaultEnvelope;
	fingerprint: string | null;
};

export async function putIdentity(input: {
	publicKey: string;
	encryptedPrivateKey: VaultEnvelope;
	fingerprint: string;
}): Promise<{ publicKey: string; fingerprint: string }> {
	const res = await apiFetch('/v1/identity', {
		method: 'PUT',
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string }).error ?? `Identity save failed (${res.status})`);
	}
	return data as { publicKey: string; fingerprint: string };
}

export async function fetchIdentityBundle(): Promise<IdentityBundle | null> {
	const res = await apiFetch('/v1/identity/me');
	const data = (await res.json().catch(() => ({}))) as { identity?: IdentityBundle | null };
	if (!res.ok) throw new Error('Could not load identity');
	return data.identity ?? null;
}

/** Used only to wrap a freshly-created item key for a vault's other user recipients (create path). */
export async function fetchUserPublic(userId: string): Promise<PublicUser> {
	const res = await apiFetch(`/v1/users/${userId}/public`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'User public key not found');
	return data as PublicUser;
}
