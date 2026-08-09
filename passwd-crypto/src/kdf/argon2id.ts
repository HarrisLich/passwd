import { argon2id } from 'hash-wasm';

/** OWASP-oriented interactive defaults (memory in KiB). */
export const DEFAULT_ARGON2ID = {
	memorySize: 19_456,
	iterations: 3,
	parallelism: 1,
	hashLength: 32
} as const;

export type Argon2idParams = {
	salt: Uint8Array;
	memorySize: number;
	iterations: number;
	parallelism: number;
	hashLength: number;
};

export async function deriveKeyFromPassword(
	password: string,
	params: Argon2idParams
): Promise<Uint8Array> {
	if (params.salt.length < 8) {
		throw new Error('argon2id salt must be at least 8 bytes');
	}

	const hash = await argon2id({
		password,
		salt: params.salt,
		parallelism: params.parallelism,
		iterations: params.iterations,
		memorySize: params.memorySize,
		hashLength: params.hashLength,
		outputType: 'binary'
	});

	return hash instanceof Uint8Array ? hash : new Uint8Array(hash);
}
