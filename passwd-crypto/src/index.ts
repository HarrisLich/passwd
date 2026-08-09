export { deriveKeyFromPassword, DEFAULT_ARGON2ID, type Argon2idParams } from './kdf/argon2id.js';
export {
	generateSecretKey,
	normalizeSecretKey,
	combineMasterAndSecretKey
} from './keys/secret-key.js';
export {
	dualDeriveFromMasterPassword,
	prepareSignup,
	prepareUnlock,
	authPasswordFromKeyMaterial,
	type DualDeriveResult,
	type SignupMaterial,
	type UnlockMaterial
} from './keys/dual-derive.js';
export { encryptJson, decryptJson } from './cipher/xchacha.js';
export { vaultEnvelopeSchema, type VaultEnvelope } from './types/envelope.js';
export { kdfParamsSchema, type KdfParams, defaultArgon2Config } from './types/kdf-params.js';
export { wipeBytes, toBase64, fromBase64, toBase64Url, toHex } from './encoding.js';
export { randomBytes } from './random.js';
export {
	generateBoxKeyPair,
	publicKeyFingerprint,
	sealToPublicKey,
	openSealed,
	sealBytesToBase64,
	openSealedBase64,
	wrapBoxSecretKey,
	unwrapBoxSecretKey,
	encodePublicKey,
	decodePublicKey,
	createWrappedIdentity,
	restoreIdentity,
	sealSymmetricKey,
	openSymmetricKey,
	hasAccessAtLeast,
	ACCESS_LEVEL_RANK,
	type BoxKeyPair,
	type AccessLevel
} from './keys/box.js';
