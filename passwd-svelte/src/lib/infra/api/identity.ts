import { apiFetch } from '$lib/infra/api/client';
import type { VaultEnvelope } from '$lib/infra/crypto';

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

export async function lookupUserByEmail(email: string): Promise<PublicUser> {
	const res = await apiFetch(`/v1/users/lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`);
	const data = await res.json().catch(() => ({}));
	if (res.status === 404) throw new Error('No Passwd user with that email (they must sign up first)');
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Lookup failed');
	return data as PublicUser;
}

export async function fetchUserPublic(userId: string): Promise<PublicUser> {
	const res = await apiFetch(`/v1/users/${userId}/public`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? 'User public key not found');
	return data as PublicUser;
}
