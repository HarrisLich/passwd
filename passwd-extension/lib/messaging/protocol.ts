import { z } from 'zod';

/**
 * Typed request/response protocol between popup/content (senders) and the
 * background service worker (sole owner of the vault key + API client).
 * Every inbound message is zod-validated at the background boundary
 * (lib/messaging/router.ts) — unknown `type` values are rejected there.
 */

const generatorOptionsSchema = z.object({
	upper: z.boolean(),
	lower: z.boolean(),
	digits: z.boolean(),
	symbols: z.boolean()
});
export type GeneratorOptions = z.infer<typeof generatorOptionsSchema>;

const formKindSchema = z.enum(['login', 'signup', 'change-password']);
export type FormKind = z.infer<typeof formKindSchema>;

export const messageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('UNLOCK'),
		payload: z.object({
			email: z.string().email(),
			masterPassword: z.string().min(1),
			secretKey: z.string().min(1)
		})
	}),
	z.object({
		type: z.literal('LOCK'),
		payload: z.object({}).optional()
	}),
	z.object({
		type: z.literal('GET_SESSION_STATE'),
		payload: z.object({}).optional()
	}),
	z.object({
		type: z.literal('GET_VAULT_ITEMS'),
		payload: z.object({ query: z.string().optional() })
	}),
	z.object({
		type: z.literal('GET_SUGGESTIONS_FOR_ORIGIN'),
		payload: z.object({ origin: z.string().min(1) })
	}),
	z.object({
		type: z.literal('FILL_LOGIN'),
		payload: z.object({ origin: z.string().min(1), itemId: z.string().min(1) })
	}),
	z.object({
		type: z.literal('GENERATE_PASSWORD'),
		payload: z.object({
			length: z.number().int().min(4).max(128).optional(),
			options: generatorOptionsSchema.partial().optional()
		})
	}),
	z.object({
		type: z.literal('GET_GENERATOR_HISTORY'),
		payload: z.object({}).optional()
	}),
	z.object({
		type: z.literal('CAPTURE_SUBMISSION'),
		payload: z.object({
			origin: z.string().min(1),
			url: z.string().min(1),
			formKind: formKindSchema,
			username: z.string(),
			password: z.string().min(1)
		})
	}),
	z.object({
		type: z.literal('SAVE_LOGIN'),
		payload: z.object({
			mode: z.enum(['create', 'update']),
			itemId: z.string().optional(),
			data: z.object({
				title: z.string().min(1),
				username: z.string(),
				password: z.string(),
				url: z.string()
			})
		})
	}),
	z.object({
		type: z.literal('DISMISS_SAVE_PROMPT'),
		payload: z.object({
			origin: z.string().min(1),
			username: z.string(),
			scope: z.enum(['this-time', 'session'])
		})
	})
]);

export type ExtensionMessage = z.infer<typeof messageSchema>;
export type ExtensionMessageType = ExtensionMessage['type'];

/** Narrow an ExtensionMessage union member by its `type` literal. */
export type MessageOf<T extends ExtensionMessageType> = Extract<ExtensionMessage, { type: T }>;

export type VaultItemSummary = {
	id: string;
	title: string;
	username: string;
	password: string;
	url: string;
	updatedAt: string;
};

export type SuggestionItem = {
	id: string;
	title: string;
	username: string;
	url: string;
};

export type PendingSavePrompt = {
	/** 'locked': the vault isn't unlocked, so we can't tell save vs update or actually persist anything — the password is still recoverable from generator history. */
	mode: 'save' | 'update' | 'locked';
	existingItemId?: string;
	username: string;
	password: string;
	url: string;
};

/** Response payload shape per message type — informal (not zod-validated; background-generated). */
export type ResponseOf<T extends ExtensionMessageType> = T extends 'UNLOCK'
	? { ok: true } | { ok: false; error: string }
	: T extends 'LOCK'
		? { ok: true }
		: T extends 'GET_SESSION_STATE'
			? { unlocked: boolean; email: string | null }
			: T extends 'GET_VAULT_ITEMS'
				? { items: VaultItemSummary[] }
				: T extends 'GET_SUGGESTIONS_FOR_ORIGIN'
					? { items: SuggestionItem[] }
					: T extends 'FILL_LOGIN'
						? { username: string; password: string } | { error: string }
						: T extends 'GENERATE_PASSWORD'
							? { password: string; id: string }
							: T extends 'GET_GENERATOR_HISTORY'
								? { items: Array<{ id: string; password: string; createdAt: string }> }
								: T extends 'CAPTURE_SUBMISSION'
									? { shouldPrompt: boolean; mode?: 'save' | 'update' | 'locked'; existingItemId?: string }
									: T extends 'SAVE_LOGIN'
										? { ok: true; id: string } | { ok: false; error: string }
										: T extends 'DISMISS_SAVE_PROMPT'
											? { ok: true }
											: never;
