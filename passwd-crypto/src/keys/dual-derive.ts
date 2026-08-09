import { deriveKeyFromPassword, type Argon2idParams } from '../kdf/argon2id.js';
import { combineMasterAndSecretKey, generateSecretKey } from './secret-key.js';
import { fromBase64, toBase64, toBase64Url, wipeBytes } from '../encoding.js';
import { randomBytes } from '../random.js';
import {
	defaultArgon2Config,
	kdfParamsSchema,
	type KdfParams
} from '../types/kdf-params.js';

export type DualDeriveResult = {
	encryptionKeyMaterial: Uint8Array;
	authKeyMaterial: Uint8Array;
};

export type SignupMaterial = {
	secretKey: string;
	kdfParams: KdfParams;
	/** Send this as Better Auth `password` — never the master password. */
	authPassword: string;
	vaultKey: Uint8Array;
};

export type UnlockMaterial = {
	authPassword: string;
	vaultKey: Uint8Array;
};

function argonParams(salt: Uint8Array, kdf: KdfParams): Argon2idParams {
	return {
		salt,
		memorySize: kdf.argon2.memorySize,
		iterations: kdf.argon2.iterations,
		parallelism: kdf.argon2.parallelism,
		hashLength: kdf.argon2.hashLength
	};
}

export async function dualDeriveFromMasterPassword(
	password: string,
	encParams: Argon2idParams,
	authParams: Argon2idParams
): Promise<DualDeriveResult> {
	const [encryptionKeyMaterial, authKeyMaterial] = await Promise.all([
		deriveKeyFromPassword(password, encParams),
		deriveKeyFromPassword(password, authParams)
	]);
	return { encryptionKeyMaterial, authKeyMaterial };
}

export function authPasswordFromKeyMaterial(authKeyMaterial: Uint8Array): string {
	return toBase64Url(authKeyMaterial);
}

/** Fresh signup: Secret Key + salts + dual keys. */
export async function prepareSignup(masterPassword: string): Promise<SignupMaterial> {
	if (masterPassword.length < 8) {
		throw new Error('Master password must be at least 8 characters');
	}

	const secretKey = generateSecretKey();
	const saltEnc = randomBytes(16);
	const saltAuth = randomBytes(16);
	const argon2 = defaultArgon2Config();

	const kdfParams: KdfParams = {
		v: 1,
		argon2,
		saltEnc: toBase64(saltEnc),
		saltAuth: toBase64(saltAuth)
	};

	const { encryptionKeyMaterial, authKeyMaterial } = await dualDeriveFromMasterPassword(
		masterPassword,
		argonParams(saltEnc, kdfParams),
		argonParams(saltAuth, kdfParams)
	);

	const vaultKey = combineMasterAndSecretKey(encryptionKeyMaterial, secretKey);
	const authPassword = authPasswordFromKeyMaterial(authKeyMaterial);

	wipeBytes(encryptionKeyMaterial);
	wipeBytes(authKeyMaterial);

	return { secretKey, kdfParams, authPassword, vaultKey };
}

/** Unlock + optional session re-auth from stored public kdfParams. */
export async function prepareUnlock(
	masterPassword: string,
	secretKey: string,
	kdfParamsInput: unknown
): Promise<UnlockMaterial> {
	const kdfParams = kdfParamsSchema.parse(kdfParamsInput);
	const { encryptionKeyMaterial, authKeyMaterial } = await dualDeriveFromMasterPassword(
		masterPassword,
		argonParams(fromBase64(kdfParams.saltEnc), kdfParams),
		argonParams(fromBase64(kdfParams.saltAuth), kdfParams)
	);

	const vaultKey = combineMasterAndSecretKey(encryptionKeyMaterial, secretKey);
	const authPassword = authPasswordFromKeyMaterial(authKeyMaterial);

	wipeBytes(encryptionKeyMaterial);
	wipeBytes(authKeyMaterial);

	return { authPassword, vaultKey };
}
