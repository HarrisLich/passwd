import { z } from 'zod';

/**
 * Body the client should send to Better Auth sign-up.
 * `password` MUST be derived auth material, never the master password.
 */
export const vaultSignUpBodySchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).default('Vault'),
	password: z.string().min(16),
	kdfParams: z.string().min(2) // JSON string of public Argon2 params
});

export type VaultSignUpBody = z.infer<typeof vaultSignUpBodySchema>;
