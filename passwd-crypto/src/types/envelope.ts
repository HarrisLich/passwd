import { z } from 'zod';

export const vaultEnvelopeSchema = z.object({
	v: z.literal(1),
	alg: z.literal('xchacha20poly1305'),
	nonce: z.string().min(1),
	ciphertext: z.string().min(1)
});

export type VaultEnvelope = z.infer<typeof vaultEnvelopeSchema>;
