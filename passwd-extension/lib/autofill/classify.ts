import type { DetectedForm } from './detect';
import type { FormKind } from '../messaging/protocol';

const NEW_PASSWORD_AUTOCOMPLETE = ['new-password'];
const CURRENT_PASSWORD_AUTOCOMPLETE = ['current-password'];
const SIGNUP_COPY = ['create account', 'sign up', 'register', 'create password', 'confirm password'];

/** autocomplete can carry multiple space-separated tokens (e.g. "current-password webauthn") — check token membership, not exact string equality. */
function autocompleteTokens(el: HTMLInputElement): string[] {
	return (el.autocomplete || '').toLowerCase().split(/\s+/).filter(Boolean);
}

function hasSignupCopyNearby(form: DetectedForm, doc: Document): boolean {
	const scope = form.form ?? doc.body;
	const text = scope.textContent?.toLowerCase() ?? '';
	return SIGNUP_COPY.some((needle) => text.includes(needle));
}

/** Classifies a detected form as login / signup / change-password (see .cursor skill + plan decision 9's field heuristics). */
export function classifyForm(form: DetectedForm, doc: Document = document): FormKind {
	const fields = form.passwordFields;
	const hasCurrent = fields.some((f) => autocompleteTokens(f).some((t) => CURRENT_PASSWORD_AUTOCOMPLETE.includes(t)));
	const hasNew = fields.some((f) => autocompleteTokens(f).some((t) => NEW_PASSWORD_AUTOCOMPLETE.includes(t)));

	if (fields.length >= 2) return hasCurrent ? 'change-password' : 'signup';
	if (hasNew) return 'signup';
	if (hasCurrent) return 'login';
	if (hasSignupCopyNearby(form, doc)) return 'signup';
	return 'login';
}
