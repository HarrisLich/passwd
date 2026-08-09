import { describe, expect, it } from 'vitest';
import {
	createWrappedIdentity,
	openSymmetricKey,
	randomBytes,
	restoreIdentity,
	sealSymmetricKey
} from '../src/index.js';

describe('box wrapping', () => {
	it('round-trips identity wrap and sealed symmetric keys', () => {
		const vaultKey = randomBytes(32);
		const identity = createWrappedIdentity(vaultKey);
		const restored = restoreIdentity(
			identity.publicKey,
			identity.encryptedPrivateKey,
			vaultKey
		);
		expect(Buffer.from(restored.publicKey).equals(Buffer.from(identity.keyPair.publicKey))).toBe(
			true
		);
		expect(Buffer.from(restored.secretKey).equals(Buffer.from(identity.keyPair.secretKey))).toBe(
			true
		);

		const itemKey = randomBytes(32);
		const wrapped = sealSymmetricKey(itemKey, identity.publicKey);
		const opened = openSymmetricKey(wrapped, restored);
		expect(Buffer.from(opened).equals(Buffer.from(itemKey))).toBe(true);
	});
});
