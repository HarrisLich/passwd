import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { fromBase64, toBase64, utf8 } from '../encoding.js';
import { randomBytes } from '../random.js';
import { vaultEnvelopeSchema, type VaultEnvelope } from '../types/envelope.js';

const NONCE_LENGTH = 24;

export function encryptJson(plaintext: unknown, key: Uint8Array): VaultEnvelope {
	if (key.byteLength !== 32) {
		throw new Error('XChaCha20-Poly1305 key must be 32 bytes');
	}
	const nonce = randomBytes(NONCE_LENGTH);
	const message = utf8(JSON.stringify(plaintext));
	const ciphertext = xchacha20poly1305(key, nonce).encrypt(message);

	return vaultEnvelopeSchema.parse({
		v: 1,
		alg: 'xchacha20poly1305',
		nonce: toBase64(nonce),
		ciphertext: toBase64(ciphertext)
	});
}

export function decryptJson<T = unknown>(envelope: VaultEnvelope, key: Uint8Array): T {
	if (key.byteLength !== 32) {
		throw new Error('XChaCha20-Poly1305 key must be 32 bytes');
	}
	const parsed = vaultEnvelopeSchema.parse(envelope);
	const nonce = fromBase64(parsed.nonce);
	const ciphertext = fromBase64(parsed.ciphertext);

	let message: Uint8Array;
	try {
		message = xchacha20poly1305(key, nonce).decrypt(ciphertext);
	} catch {
		throw new Error('Decryption failed — wrong key or corrupted envelope');
	}

	return JSON.parse(new TextDecoder().decode(message)) as T;
}
