import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

/**
 * Prefer same-origin (Vite proxies /api + /v1 in dev).
 * Mixing localhost and 127.0.0.1 breaks session cookies (cross-site).
 */
export function apiBase(): string {
	const configured = env.PUBLIC_PASSWD_API_URL;
	if (configured != null && configured.length > 0) return configured.replace(/\/$/, '');
	if (browser) return '';
	return 'http://127.0.0.1:8787';
}

/** Typed REST client for passwd-server. Always sends cookies for session auth. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const headers = new Headers(init?.headers);
	if (!headers.has('content-type') && init?.body) {
		headers.set('content-type', 'application/json');
	}

	return fetch(`${apiBase()}${path}`, {
		...init,
		credentials: 'include',
		headers
	});
}
