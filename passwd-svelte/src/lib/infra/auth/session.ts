import { apiFetch } from '$lib/infra/api/client';
import type { KdfParams } from '$lib/infra/crypto';

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	kdfParams: string;
};

type ErrorBody = {
	message?: string;
	error?: string;
	kdfParams?: string;
};

async function readJson(res: Response): Promise<ErrorBody> {
	return (await res.json().catch(() => ({}))) as ErrorBody;
}

export async function signUpEmail(input: {
	email: string;
	authPassword: string;
	name: string;
	kdfParams: KdfParams;
}): Promise<{ user: SessionUser }> {
	const res = await apiFetch('/api/auth/sign-up/email', {
		method: 'POST',
		body: JSON.stringify({
			email: input.email,
			password: input.authPassword,
			name: input.name,
			kdfParams: JSON.stringify(input.kdfParams)
		})
	});

	const data = await readJson(res);
	if (!res.ok) {
		throw new Error(data.message ?? data.error ?? `Sign-up failed (${res.status})`);
	}
	return data as unknown as { user: SessionUser };
}

export async function signInEmail(input: {
	email: string;
	authPassword: string;
}): Promise<{ user: SessionUser }> {
	const res = await apiFetch('/api/auth/sign-in/email', {
		method: 'POST',
		body: JSON.stringify({
			email: input.email,
			password: input.authPassword
		})
	});

	const data = await readJson(res);
	if (!res.ok) {
		throw new Error(data.message ?? data.error ?? `Sign-in failed (${res.status})`);
	}
	return data as unknown as { user: SessionUser };
}

export async function fetchKdfParams(email: string): Promise<KdfParams> {
	const res = await apiFetch(`/v1/kdf/params?email=${encodeURIComponent(email)}`);
	const data = await readJson(res);
	if (!res.ok) {
		throw new Error(
			data.error === 'not_found' ? 'No account for that email' : 'Could not load KDF params'
		);
	}
	if (!data.kdfParams) throw new Error('Could not load KDF params');
	return JSON.parse(data.kdfParams) as KdfParams;
}

export async function fetchMe(): Promise<SessionUser | null> {
	const res = await apiFetch('/v1/me');
	if (res.status === 401) return null;
	if (!res.ok) throw new Error('Session check failed');
	return (await res.json()) as SessionUser;
}
