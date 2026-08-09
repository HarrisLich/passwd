import { wipeBytes, type BoxKeyPair } from '$lib/infra/crypto';

/** In-memory vault key + identity only — never persisted. */
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

export function setActiveVaultId(vaultId: string | null) {
	activeVaultId = vaultId;
}

export function setVaultSession(
	email: string,
	userId: string,
	key: Uint8Array,
	identity: BoxKeyPair
) {
	if (vaultKey) wipeBytes(vaultKey);
	if (identityKeyPair) {
		wipeBytes(identityKeyPair.secretKey);
		wipeBytes(identityKeyPair.publicKey);
	}
	vaultKey = new Uint8Array(key);
	identityKeyPair = {
		publicKey: new Uint8Array(identity.publicKey),
		secretKey: new Uint8Array(identity.secretKey)
	};
	unlockedEmail = email;
	unlockedUserId = userId;
}

export function lockVault() {
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
