/**
 * Recall list for passwords generated-but-not-yet-saved (e.g. signup abandoned
 * mid-flow). chrome.storage.session only — never at-rest encrypted (decision 3):
 * building a second encryption path for a throwaway convenience feature would
 * duplicate passwd-crypto's job, and storage.session is memory-backed and
 * cleared on full browser close, so the exposure window is already bounded.
 */

const STORAGE_KEY = 'generator:history';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50;

export type GeneratorHistoryEntry = { id: string; password: string; createdAt: string };

async function readAll(): Promise<GeneratorHistoryEntry[]> {
	const stored = await chrome.storage.session.get(STORAGE_KEY);
	const raw = (stored[STORAGE_KEY] as GeneratorHistoryEntry[] | undefined) ?? [];
	const cutoff = Date.now() - MAX_AGE_MS;
	const pruned = raw.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
	if (pruned.length !== raw.length) await chrome.storage.session.set({ [STORAGE_KEY]: pruned });
	return pruned;
}

export async function addHistoryEntry(password: string): Promise<GeneratorHistoryEntry> {
	const entry: GeneratorHistoryEntry = { id: crypto.randomUUID(), password, createdAt: new Date().toISOString() };
	const existing = await readAll();
	const next = [entry, ...existing].slice(0, MAX_ENTRIES);
	await chrome.storage.session.set({ [STORAGE_KEY]: next });
	return entry;
}

export async function getHistory(): Promise<GeneratorHistoryEntry[]> {
	return readAll();
}
