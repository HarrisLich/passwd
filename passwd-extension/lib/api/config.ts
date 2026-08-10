// Defaults to the deployed production API so the extension works out of the box on
// any machine — the options page lets you override it (e.g. back to
// http://127.0.0.1:8787) when developing against a local passwd-server instead.
const DEFAULT_API_BASE = 'https://passwd-server.harris-lichstein.workers.dev';
const STORAGE_KEY = 'settings:apiBaseUrl';

/** Options page lets you point the extension at a non-default passwd-server (e.g. local dev). */
export async function getApiBase(): Promise<string> {
	const stored = await chrome.storage.local.get(STORAGE_KEY);
	const value = stored[STORAGE_KEY];
	if (typeof value === 'string' && value.length > 0) return value.replace(/\/$/, '');
	return DEFAULT_API_BASE;
}

export async function setApiBase(url: string): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEY]: url.trim().replace(/\/$/, '') });
}
