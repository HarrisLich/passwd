import { blake2b } from '@noble/hashes/blake2.js';
import nacl from 'tweetnacl';
import { fromBase64, toBase64, toHex, wipeBytes } from '../encoding.js';
import { encryptJson, decryptJson } from '../cipher/xchacha.js';
import type { VaultEnvelope } from '../types/envelope.js';

export type BoxKeyPair = {
	publicKey: Uint8Array;
	secretKey: Uint8Array;
};

export type AccessLevel = 'viewer' | 'editor' | 'manager' | 'owner';

export const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
	viewer: 1,
	editor: 2,
	manager: 3,
	owner: 4
};

export function generateBoxKeyPair(): BoxKeyPair {
	const kp = nacl.box.keyPair();
	return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

/** Short public fingerprint for UI / lookup (hex of blake2b-128). */
export function publicKeyFingerprint(publicKey: Uint8Array): string {
	return toHex(blake2b(publicKey, { dkLen: 16 }));
}

/**
 * Anonymous sealed box: ephemeral X25519 + nacl.box.
 * Layout: ephemeral_pk (32) || nonce (24) || ciphertext.
 */
export function sealToPublicKey(message: Uint8Array, recipientPublicKey: Uint8Array): Uint8Array {
	if (recipientPublicKey.byteLength !== nacl.box.publicKeyLength) {
		throw new Error('Recipient public key must be 32 bytes');
	}
	const eph = nacl.box.keyPair();
	const nonce = nacl.randomBytes(nacl.box.nonceLength);
	const boxed = nacl.box(message, nonce, recipientPublicKey, eph.secretKey);
	if (!boxed) throw new Error('Seal failed');

	const out = new Uint8Array(eph.publicKey.length + nonce.length + boxed.length);
	out.set(eph.publicKey, 0);
	out.set(nonce, eph.publicKey.length);
	out.set(boxed, eph.publicKey.length + nonce.length);
	wipeBytes(eph.secretKey);
	return out;
}

export function openSealed(sealed: Uint8Array, keyPair: BoxKeyPair): Uint8Array {
	const pkLen = nacl.box.publicKeyLength;
	const nLen = nacl.box.nonceLength;
	if (sealed.byteLength < pkLen + nLen + 16) {
		throw new Error('Sealed blob too short');
	}
	const ephPk = sealed.subarray(0, pkLen);
	const nonce = sealed.subarray(pkLen, pkLen + nLen);
	const boxed = sealed.subarray(pkLen + nLen);
	const opened = nacl.box.open(boxed, nonce, ephPk, keyPair.secretKey);
	if (!opened) throw new Error('Failed to open sealed box');
	return opened;
}

export function sealBytesToBase64(message: Uint8Array, recipientPublicKeyB64: string): string {
	return toBase64(sealToPublicKey(message, fromBase64(recipientPublicKeyB64)));
}

export function openSealedBase64(sealedB64: string, keyPair: BoxKeyPair): Uint8Array {
	return openSealed(fromBase64(sealedB64), keyPair);
}

/** Wrap asymmetric private key with master-derived vault key (XChaCha envelope). */
export function wrapBoxSecretKey(secretKey: Uint8Array, vaultKey: Uint8Array): VaultEnvelope {
	if (secretKey.byteLength !== nacl.box.secretKeyLength) {
		throw new Error('Box secret key must be 32 bytes');
	}
	return encryptJson({ sk: toBase64(secretKey) }, vaultKey);
}

export function unwrapBoxSecretKey(envelope: VaultEnvelope, vaultKey: Uint8Array): Uint8Array {
	const payload = decryptJson<{ sk: string }>(envelope, vaultKey);
	const sk = fromBase64(payload.sk);
	if (sk.byteLength !== nacl.box.secretKeyLength) {
		throw new Error('Unwrapped box secret key has invalid length');
	}
	return sk;
}

export function encodePublicKey(publicKey: Uint8Array): string {
	return toBase64(publicKey);
}

export function decodePublicKey(publicKeyB64: string): Uint8Array {
	const pk = fromBase64(publicKeyB64);
	if (pk.byteLength !== nacl.box.publicKeyLength) {
		throw new Error('Public key must be 32 bytes');
	}
	return pk;
}

/** Create identity keypair and wrap the secret for server storage. */
export function createWrappedIdentity(vaultKey: Uint8Array): {
	publicKey: string;
	encryptedPrivateKey: VaultEnvelope;
	fingerprint: string;
	keyPair: BoxKeyPair;
} {
	const keyPair = generateBoxKeyPair();
	return {
		publicKey: encodePublicKey(keyPair.publicKey),
		encryptedPrivateKey: wrapBoxSecretKey(keyPair.secretKey, vaultKey),
		fingerprint: publicKeyFingerprint(keyPair.publicKey),
		keyPair
	};
}

export function restoreIdentity(
	publicKeyB64: string,
	encryptedPrivateKey: VaultEnvelope,
	vaultKey: Uint8Array
): BoxKeyPair {
	const publicKey = decodePublicKey(publicKeyB64);
	const secretKey = unwrapBoxSecretKey(encryptedPrivateKey, vaultKey);
	return { publicKey, secretKey };
}

export function sealSymmetricKey(
	symmetricKey: Uint8Array,
	recipientPublicKeyB64: string
): string {
	if (symmetricKey.byteLength !== 32) {
		throw new Error('Symmetric key must be 32 bytes');
	}
	return sealBytesToBase64(symmetricKey, recipientPublicKeyB64);
}

export function openSymmetricKey(wrappedB64: string, keyPair: BoxKeyPair): Uint8Array {
	const key = openSealedBase64(wrappedB64, keyPair);
	if (key.byteLength !== 32) {
		throw new Error('Unwrapped symmetric key must be 32 bytes');
	}
	return key;
}

export function hasAccessAtLeast(have: AccessLevel, need: AccessLevel): boolean {
	return ACCESS_LEVEL_RANK[have] >= ACCESS_LEVEL_RANK[need];
}
