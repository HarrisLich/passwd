import { z } from 'zod';
import { DEFAULT_ARGON2ID } from '../kdf/argon2id.js';

export const kdfParamsSchema = z.object({
	v: z.literal(1),
	argon2: z.object({
		memorySize: z.number().int().positive(),
		iterations: z.number().int().positive(),
		parallelism: z.number().int().positive(),
		hashLength: z.number().int().positive()
	}),
	saltEnc: z.string().min(1),
	saltAuth: z.string().min(1)
});

export type KdfParams = z.infer<typeof kdfParamsSchema>;

export function defaultArgon2Config() {
	return { ...DEFAULT_ARGON2ID };
}
