import { messageSchema, type ExtensionMessage } from './protocol';
import * as sessionService from '../session/session.service';
import * as vaultService from '../vault/vault.service';
import { generatePassword } from '../generator/generator';
import { addHistoryEntry, getHistory } from '../generator/history.store';
import * as saveState from '../save-detection/save-state.store';
import { logSave, redact } from '../save-detection/debug-log';

/**
 * Background-side dispatcher: validates every inbound message against the
 * shared schema, rejects unknown/malformed `type`s, and routes to the owning
 * service. This is the only place lib/session, lib/vault, lib/generator, and
 * lib/save-detection are wired together.
 */
export async function handleMessage(raw: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
	const parsed = messageSchema.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, error: 'Unknown or malformed message' };
	}

	try {
		return await dispatch(parsed.data, sender);
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
	}
}

async function dispatch(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
	switch (message.type) {
		case 'UNLOCK':
			return sessionService.unlock(message.payload);

		case 'LOCK': {
			const res = await sessionService.lock();
			vaultService.invalidateCache();
			return res;
		}

		case 'GET_SESSION_STATE':
			return sessionService.getSessionState();

		case 'GET_VAULT_ITEMS':
			return { items: await vaultService.getVaultItems(message.payload.query) };

		case 'GET_SUGGESTIONS_FOR_ORIGIN':
			return { items: await vaultService.getSuggestionsForOrigin(message.payload.origin) };

		case 'FILL_LOGIN':
			return vaultService.fillLogin(message.payload.origin, message.payload.itemId);

		case 'GENERATE_PASSWORD': {
			const password = generatePassword(message.payload);
			const entry = await addHistoryEntry(password);
			return { password, id: entry.id };
		}

		case 'GET_GENERATOR_HISTORY':
			return { items: await getHistory() };

		case 'CAPTURE_SUBMISSION': {
			logSave('router: received CAPTURE_SUBMISSION', {
				origin: message.payload.origin,
				url: message.payload.url,
				formKind: message.payload.formKind,
				username: message.payload.username || '(empty)',
				password: redact(message.payload.password),
				senderTabId: sender.tab?.id,
				senderUrl: sender.tab?.url
			});
			const prompt = await saveState.resolveConfirmedSubmission(
				{
					origin: message.payload.origin,
					url: message.payload.url,
					formKind: message.payload.formKind,
					username: message.payload.username,
					password: message.payload.password
				},
				(origin, username) => vaultService.findExistingLoginForOrigin(origin, username)
			);
			logSave('router: resolved CAPTURE_SUBMISSION to', prompt);
			return { shouldPrompt: prompt !== null, mode: prompt?.mode, existingItemId: prompt?.existingItemId };
		}

		case 'SAVE_LOGIN':
			return vaultService.saveLogin(message.payload);

		case 'DISMISS_SAVE_PROMPT':
			saveState.dismiss(message.payload.origin, message.payload.username, message.payload.scope);
			return { ok: true };

		default: {
			const exhaustive: never = message;
			return exhaustive;
		}
	}
}
