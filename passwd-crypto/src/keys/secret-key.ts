import { blake2b } from '@noble/hashes/blake2.js';
import { utf8 } from '../encoding.js';
import { randomBytes } from '../random.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a high-entropy Secret Key (never uploaded). Format: AAAA-BBBBBB-... */
export function generateSecretKey(): string {
	const bytes = randomBytes(20);
	const chars: string[] = [];
	for (const b of bytes) {
		chars.push(ALPHABET[b % ALPHABET.length]!);
	}
	const raw = chars.join('');
	return [raw.slice(0, 4), raw.slice(4, 10), raw.slice(10, 16), raw.slice(16, 20)].join('-');
}

export function normalizeSecretKey(secretKey: string): string {
	return secretKey.trim().toUpperCase().replace(/\s+/g, '');
}

/** Mix master-password-derived key with Secret Key → vault key. */
export function combineMasterAndSecretKey(
	masterDerivedKey: Uint8Array,
	secretKey: string
): Uint8Array {
	if (masterDerivedKey.byteLength !== 32) {
		throw new Error('masterDerivedKey must be 32 bytes');
	}
	const normalized = normalizeSecretKey(secretKey);
	if (normalized.length < 16) {
		throw new Error('Secret Key is too short');
	}
	// Keyed Blake2b: K_mp as key, Secret Key as message
	return blake2b(utf8(normalized), { dkLen: 32, key: masterDerivedKey });
}
