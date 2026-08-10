/**
 * Thin re-export of passwd-crypto, mirroring passwd-svelte's
 * src/lib/infra/crypto/index.ts. Import only from lib/session and lib/vault
 * (background context) — never from entrypoints/content or entrypoints/popup.
 */
export {
	prepareSignup,
	prepareUnlock,
	encryptJson,
	decryptJson,
	wipeBytes,
	randomBytes,
	createWrappedIdentity,
	restoreIdentity,
	sealSymmetricKey,
	openSymmetricKey,
	openSealedBase64,
	decodePublicKey,
	generateBoxKeyPair,
	publicKeyFingerprint,
	encodePublicKey,
	sealBytesToBase64,
	toBase64,
	fromBase64,
	type KdfParams,
	type SignupMaterial,
	type UnlockMaterial,
	type VaultEnvelope,
	type BoxKeyPair,
	type AccessLevel
} from 'passwd-crypto';
