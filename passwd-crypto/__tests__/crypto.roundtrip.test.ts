import { describe, expect, it } from 'vitest';
import {
	createWrappedIdentity,
	decryptJson,
	encryptJson,
	openSymmetricKey,
	prepareSignup,
	prepareUnlock,
	restoreIdentity,
	sealSymmetricKey,
	wipeBytes
} from '../src/index.js';
import { randomBytes } from '../src/random.js';

describe('passwd-crypto', () => {
	it('derives distinct auth vs vault material and round-trips encryption', async () => {
		const master = 'correct horse battery staple';
		const signup = await prepareSignup(master);

		expect(signup.secretKey).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{6}-[A-Z2-9]{6}-[A-Z2-9]{4}$/);
		expect(signup.authPassword.length).toBeGreaterThanOrEqual(16);
		expect(signup.vaultKey.byteLength).toBe(32);

		const unlock = await prepareUnlock(master, signup.secretKey, signup.kdfParams);
		expect(unlock.authPassword).toBe(signup.authPassword);
		expect(Buffer.from(unlock.vaultKey).equals(Buffer.from(signup.vaultKey))).toBe(true);

		const envelope = encryptJson({ title: 'Example', password: 's3cret' }, signup.vaultKey);
		const plain = decryptJson<{ title: string; password: string }>(envelope, unlock.vaultKey);
		expect(plain).toEqual({ title: 'Example', password: 's3cret' });

		expect(() => decryptJson(envelope, new Uint8Array(32))).toThrow(/Decryption failed/);

		wipeBytes(signup.vaultKey);
		wipeBytes(unlock.vaultKey);
	}, 30_000);

	it('rejects wrong secret key', async () => {
		const master = 'another strong master password';
		const signup = await prepareSignup(master);
		const unlock = await prepareUnlock(master, 'ZZZZ-ZZZZZZ-ZZZZZZ-ZZZZ', signup.kdfParams);
		expect(Buffer.from(unlock.vaultKey).equals(Buffer.from(signup.vaultKey))).toBe(false);
	}, 30_000);

	it('wraps identity keys and seals item keys to another user', async () => {
		const master = 'shareable master password value';
		const alice = await prepareSignup(master);
		const bob = await prepareSignup(master + ' bob');

		const aliceId = createWrappedIdentity(alice.vaultKey);
		const bobId = createWrappedIdentity(bob.vaultKey);

		const restored = restoreIdentity(
			aliceId.publicKey,
			aliceId.encryptedPrivateKey,
			alice.vaultKey
		);
		expect(Buffer.from(restored.publicKey).equals(Buffer.from(aliceId.keyPair.publicKey))).toBe(
			true
		);

		const itemKey = randomBytes(32);
		const wrappedForBob = sealSymmetricKey(itemKey, bobId.publicKey);
		const opened = openSymmetricKey(wrappedForBob, bobId.keyPair);
		expect(Buffer.from(opened).equals(Buffer.from(itemKey))).toBe(true);

		expect(() => openSymmetricKey(wrappedForBob, aliceId.keyPair)).toThrow(/Failed to open/);

		wipeBytes(alice.vaultKey);
		wipeBytes(bob.vaultKey);
		wipeBytes(itemKey);
		wipeBytes(opened);
	}, 60_000);
});
