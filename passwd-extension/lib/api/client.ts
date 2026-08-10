import { getApiBase } from './config';

/** Typed fetch wrapper for passwd-server. Always sends cookies for session auth. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const base = await getApiBase();
	const headers = new Headers(init?.headers);
	if (!headers.has('content-type') && init?.body) {
		headers.set('content-type', 'application/json');
	}

	return fetch(`${base}${path}`, {
		...init,
		credentials: 'include',
		headers
	});
}
