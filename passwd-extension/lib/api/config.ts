const DEFAULT_API_BASE = 'http://127.0.0.1:8787';
const STORAGE_KEY = 'settings:apiBaseUrl';

/** Options page lets a developer point the extension at a non-default passwd-server. */
export async function getApiBase(): Promise<string> {
	const stored = await chrome.storage.local.get(STORAGE_KEY);
	const value = stored[STORAGE_KEY];
	if (typeof value === 'string' && value.length > 0) return value.replace(/\/$/, '');
	return DEFAULT_API_BASE;
}

export async function setApiBase(url: string): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEY]: url.trim().replace(/\/$/, '') });
}
