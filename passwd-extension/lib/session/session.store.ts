import { wipeBytes, toBase64, fromBase64, type BoxKeyPair } from '../crypto';

/**
 * In-memory vault key + identity, mirroring passwd-svelte's
 * src/lib/stores/vault.svelte.ts. Additionally shadow-persisted into
 * chrome.storage.session (memory-backed, cleared on full browser close,
 * never written to disk, not reachable from content scripts) so an MV3
 * service-worker eviction after ~30s idle doesn't force re-unlock mid-session.
 * This does not change what's exposed during an active session — only
 * survives the worker restarting while the browser stays open.
 */

type PersistedSession = {
	email: string;
	userId: string;
	vaultKeyB64: string;
	identityPublicKeyB64: string;
	identitySecretKeyB64: string;
	activeVaultId: string | null;
};

const STORAGE_KEY = 'session:vault';

let vaultKey: Uint8Array | null = null;
let identityKeyPair: BoxKeyPair | null = null;
let unlockedEmail: string | null = null;
let unlockedUserId: string | null = null;
let activeVaultId: string | null = null;

export function getVaultKey(): Uint8Array | null {
	return vaultKey;
}

export function getIdentityKeyPair(): BoxKeyPair | null {
	return identityKeyPair;
}

export function isVaultUnlocked(): boolean {
	return vaultKey !== null && identityKeyPair !== null;
}

export function getUnlockedEmail(): string | null {
	return unlockedEmail;
}

export function getUnlockedUserId(): string | null {
	return unlockedUserId;
}

export function getActiveVaultId(): string | null {
	return activeVaultId;
}

export async function setActiveVaultId(vaultId: string | null): Promise<void> {
	activeVaultId = vaultId;
	await persist();
}

export async function setVaultSession(
	email: string,
	userId: string,
	key: Uint8Array,
	identity: BoxKeyPair
): Promise<void> {
	wipeCurrent();
	vaultKey = new Uint8Array(key);
	identityKeyPair = {
		publicKey: new Uint8Array(identity.publicKey),
		secretKey: new Uint8Array(identity.secretKey)
	};
	unlockedEmail = email;
	unlockedUserId = userId;
	await persist();
}

export async function lockVault(): Promise<void> {
	wipeCurrent();
	await chrome.storage.session.remove(STORAGE_KEY);
}

function wipeCurrent() {
	if (vaultKey) wipeBytes(vaultKey);
	if (identityKeyPair) {
		wipeBytes(identityKeyPair.secretKey);
		wipeBytes(identityKeyPair.publicKey);
	}
	vaultKey = null;
	identityKeyPair = null;
	unlockedEmail = null;
	unlockedUserId = null;
	activeVaultId = null;
}

async function persist(): Promise<void> {
	if (!vaultKey || !identityKeyPair || !unlockedEmail || !unlockedUserId) return;
	const payload: PersistedSession = {
		email: unlockedEmail,
		userId: unlockedUserId,
		vaultKeyB64: toBase64(vaultKey),
		identityPublicKeyB64: toBase64(identityKeyPair.publicKey),
		identitySecretKeyB64: toBase64(identityKeyPair.secretKey),
		activeVaultId
	};
	await chrome.storage.session.set({ [STORAGE_KEY]: payload });
}

/** Re-hydrate in-memory state from chrome.storage.session after a service-worker cold start. */
export async function hydrateSession(): Promise<void> {
	if (vaultKey !== null) return;
	const stored = await chrome.storage.session.get(STORAGE_KEY);
	const payload = stored[STORAGE_KEY] as PersistedSession | undefined;
	if (!payload) return;
	vaultKey = fromBase64(payload.vaultKeyB64);
	identityKeyPair = {
		publicKey: fromBase64(payload.identityPublicKeyB64),
		secretKey: fromBase64(payload.identitySecretKeyB64)
	};
	unlockedEmail = payload.email;
	unlockedUserId = payload.userId;
	activeVaultId = payload.activeVaultId;
}
