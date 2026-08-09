import { z } from 'zod';

export const messageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('FILL_REQUEST'),
		payload: z.object({ origin: z.string().url() })
	}),
	z.object({
		type: z.literal('LOCK'),
		payload: z.object({}).optional()
	})
]);

export type ExtensionMessage = z.infer<typeof messageSchema>;
