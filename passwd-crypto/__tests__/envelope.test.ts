import { describe, expect, it } from 'vitest';
import { vaultEnvelopeSchema } from '../src/types/envelope.js';

describe('vaultEnvelopeSchema', () => {
	it('accepts a v1 envelope shape', () => {
		const parsed = vaultEnvelopeSchema.parse({
			v: 1,
			alg: 'xchacha20poly1305',
			nonce: 'abc',
			ciphertext: 'def'
		});
		expect(parsed.alg).toBe('xchacha20poly1305');
	});
});
