import { findLoginForms, type DetectedForm } from '../../lib/autofill/detect';
import { classifyForm } from '../../lib/autofill/classify';
import { fillCredentials } from '../../lib/autofill/fill';
import { observeMutations } from '../../lib/autofill/observe';
import { sendMessage } from '../../lib/messaging/client';
import type { FormKind, PendingSavePrompt } from '../../lib/messaging/protocol';
import { getAutofillEnabled } from '../../lib/settings';
import { watchForm } from '../../lib/save-detection/submit-observer';
import { logSave } from '../../lib/save-detection/debug-log';
import { createSuggestionChip } from './ui/suggestion-chip';
import { createGeneratorPopover } from './ui/generator-popover';
import { createSavePromptBar } from './ui/save-prompt-bar';

/** Bump this string whenever debugging a save-prompt build so you can confirm the reload actually took. */
const DEBUG_BUILD_MARKER = 'debug-build-2';

/** Content script — form detection + fill only; asks background for fill payloads, never touches the vault key. */
export default defineContentScript({
	matches: ['<all_urls>'],
	async main(ctx) {
		logSave(`content script loaded (${DEBUG_BUILD_MARKER})`, location.href);

		if (!(await getAutofillEnabled())) return;

		const suggestionChip = await createSuggestionChip(ctx);
		const generatorPopover = await createGeneratorPopover(ctx);
		const savePromptBar = await createSavePromptBar(ctx);

		let detachWatchers: Array<() => void> = [];

		type FieldMatch = { form: DetectedForm; field: HTMLInputElement; role: 'username' | 'password' };

		/**
		 * Re-detects fresh on every focus rather than pre-wiring per-element
		 * listeners at attachForms() time. SPA frameworks (Google's sign-in flow
		 * included) frequently replace field DOM nodes after our detection pass
		 * runs, which silently orphans any listener attached directly to the old
		 * node — the symptom was the suggestion chip only appearing on a second
		 * focus, once a debounced MutationObserver pass caught up and re-wired
		 * the *new* node. Delegating via document-level focusin/focusout and
		 * looking the field up at the moment of focus sidesteps that entirely:
		 * it only ever asks "what does the DOM look like right now."
		 */
		function findFieldMatch(target: HTMLInputElement): FieldMatch | null {
			for (const form of findLoginForms(document)) {
				if (form.usernameField === target) return { form, field: target, role: 'username' };
				if (form.passwordFields.includes(target)) return { form, field: target, role: 'password' };
			}
			return null;
		}

		function isNewPasswordField(field: HTMLInputElement, form: DetectedForm, kind: FormKind): boolean {
			const isNewPassword = (field.autocomplete || '').toLowerCase().split(/\s+/).includes('new-password');
			return isNewPassword || (kind === 'signup' && form.passwordFields.length === 1);
		}

		async function showSuggestions(field: HTMLInputElement, form: DetectedForm) {
			const res = await sendMessage<'GET_SUGGESTIONS_FOR_ORIGIN'>({
				type: 'GET_SUGGESTIONS_FOR_ORIGIN',
				payload: { origin: location.origin }
			});
			suggestionChip.show(field.getBoundingClientRect(), res.items, async (itemId) => {
				const filled = await sendMessage<'FILL_LOGIN'>({
					type: 'FILL_LOGIN',
					payload: { origin: location.origin, itemId }
				});
				if ('username' in filled) fillCredentials(form, filled);
			});
		}

		async function showGenerator(field: HTMLInputElement, form: DetectedForm) {
			async function regenerate() {
				const res = await sendMessage<'GENERATE_PASSWORD'>({ type: 'GENERATE_PASSWORD', payload: {} });
				generatorPopover.show(
					field.getBoundingClientRect(),
					res.password,
					() =>
						fillCredentials(
							{ usernameField: null, passwordFields: form.passwordFields },
							{ username: '', password: res.password }
						),
					regenerate
				);
			}
			await regenerate();
		}

		document.addEventListener(
			'focusin',
			(e) => {
				const target = e.target;
				if (!(target instanceof HTMLInputElement)) return;
				const match = findFieldMatch(target);
				if (!match) return;

				if (match.role === 'password') {
					const kind = classifyForm(match.form);
					if (isNewPasswordField(match.field, match.form, kind)) {
						if (match.field.value === '') void showGenerator(match.field, match.form);
						return;
					}
				}
				void showSuggestions(match.field, match.form);
			},
			true
		);

		document.addEventListener(
			'focusout',
			(e) => {
				if (!(e.target instanceof HTMLInputElement)) return;
				setTimeout(() => {
					suggestionChip.hide();
					generatorPopover.hide();
				}, 150);
			},
			true
		);

		async function renderSavePrompt(prompt: PendingSavePrompt) {
			logSave('renderSavePrompt called with', prompt);
			savePromptBar.show(
				prompt,
				location.hostname,
				async () => {
					await sendMessage<'SAVE_LOGIN'>({
						type: 'SAVE_LOGIN',
						payload: {
							mode: prompt.mode === 'update' ? 'update' : 'create',
							itemId: prompt.existingItemId,
							data: { title: location.hostname, username: prompt.username, password: prompt.password, url: prompt.url }
						}
					});
				},
				async (scope) => {
					await sendMessage<'DISMISS_SAVE_PROMPT'>({
						type: 'DISMISS_SAVE_PROMPT',
						payload: { origin: location.origin, username: prompt.username, scope }
					});
				}
			);
		}

		function attachSubmitWatchers() {
			for (const detach of detachWatchers) detach();
			detachWatchers = [];
			const forms = findLoginForms(document);
			logSave(`attachSubmitWatchers: detected ${forms.length} form(s) on this pass`);
			for (const form of forms) {
				detachWatchers.push(watchForm(form, (prompt) => void renderSavePrompt(prompt)));
			}
		}

		attachSubmitWatchers();
		observeMutations(document.body, attachSubmitWatchers, 400);
	}
});
