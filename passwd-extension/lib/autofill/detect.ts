/** Heuristics for username/password fields — kept out of page-world key handling. */

export type DetectedForm = {
	/** null when the password field(s) aren't inside a real <form> (common on SPA login pages). */
	form: HTMLFormElement | null;
	usernameField: HTMLInputElement | null;
	passwordFields: HTMLInputElement[];
};

const USERNAME_NAME_HINTS = ['user', 'email', 'login', 'account'];
const USERNAME_AUTOCOMPLETE = ['username', 'email'];

function isVisible(el: HTMLElement): boolean {
	if (!el.isConnected) return false;
	const style = getComputedStyle(el);
	if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
	const rect = el.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

function findPasswordFields(doc: Document): HTMLInputElement[] {
	return Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(isVisible);
}

/**
 * The autocomplete attribute can carry multiple space-separated tokens (e.g.
 * Google's identifier field is `autocomplete="username webauthn"`, the
 * trailing token signalling passkey/WebAuthn support alongside the normal
 * autofill purpose) — so this must check token membership, not exact string
 * equality against the whole attribute value.
 */
function autocompleteTokens(el: HTMLInputElement): string[] {
	return (el.autocomplete || '').toLowerCase().split(/\s+/).filter(Boolean);
}

/** autocomplete=username/email or type=email — an explicit signal the page author set, unlike the name/id/placeholder text-matching fallback below. */
function isStrongUsernameSignal(el: HTMLInputElement): boolean {
	if (autocompleteTokens(el).some((t) => USERNAME_AUTOCOMPLETE.includes(t))) return true;
	return el.type === 'email';
}

function looksLikeUsername(el: HTMLInputElement): boolean {
	if (isStrongUsernameSignal(el)) return true;
	const haystack = [el.name, el.id, el.placeholder, el.getAttribute('aria-label')]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return USERNAME_NAME_HINTS.some((hint) => haystack.includes(hint));
}

/** -1 when `a` comes before `b` in document order. */
function comparePosition(a: Element, b: Element): number {
	const pos = a.compareDocumentPosition(b);
	return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function isTextlike(el: HTMLInputElement): boolean {
	return el.type === 'text' || el.type === 'email' || el.type === '';
}

function findUsernameField(passwordField: HTMLInputElement, container: Element): HTMLInputElement | null {
	const candidates = Array.from(container.querySelectorAll<HTMLInputElement>('input')).filter(
		(el) => el !== passwordField && isTextlike(el) && isVisible(el)
	);

	const before = candidates.filter((el) => comparePosition(el, passwordField) < 0);
	const beforeAndLooksLike = before.find(looksLikeUsername);
	if (beforeAndLooksLike) return beforeAndLooksLike;

	const anyLooksLike = candidates.find(looksLikeUsername);
	if (anyLooksLike) return anyLooksLike;

	// Fall back to the nearest text/email input immediately preceding the password field.
	return before.at(-1) ?? null;
}

/**
 * Password-less "identifier" steps: multi-step login flows (Google, Microsoft, Okta,
 * etc.) show an email/username field alone first, then a separate password field on
 * a later page. Only strong signals qualify here — unlike the password-anchored path,
 * there's no password field nearby to corroborate a weaker name/id/placeholder guess,
 * so that fallback would false-positive on unrelated single-field forms (e.g. a
 * newsletter signup's email field).
 */
function findIdentifierFields(doc: Document, claimed: ReadonlySet<HTMLInputElement>): HTMLInputElement[] {
	return Array.from(doc.querySelectorAll<HTMLInputElement>('input')).filter(
		(el) => !claimed.has(el) && isTextlike(el) && isVisible(el) && isStrongUsernameSignal(el)
	);
}

/**
 * Groups password fields by their nearest form/container so multiple unrelated
 * forms on one page (e.g. a login form + a newsletter signup) don't get merged.
 */
export function findLoginForms(doc: Document = document): DetectedForm[] {
	const passwordFields = findPasswordFields(doc);
	const groups = new Map<Element, HTMLInputElement[]>();

	for (const field of passwordFields) {
		const container = field.form ?? field.closest('[role="form"]') ?? doc.body;
		const list = groups.get(container) ?? [];
		list.push(field);
		groups.set(container, list);
	}

	const claimedUsernameFields = new Set<HTMLInputElement>();
	const forms: DetectedForm[] = Array.from(groups.entries()).map(([container, fields]) => {
		const usernameField = findUsernameField(fields[0], container);
		if (usernameField) claimedUsernameFields.add(usernameField);
		return {
			form: container instanceof HTMLFormElement ? container : null,
			usernameField,
			passwordFields: fields
		};
	});

	for (const field of findIdentifierFields(doc, claimedUsernameFields)) {
		const container = field.form ?? doc.body;
		forms.push({
			form: container instanceof HTMLFormElement ? container : null,
			usernameField: field,
			passwordFields: []
		});
	}

	return forms;
}

/** Single-field convenience lookup (first detected form on the page). */
export function findLoginFields(doc: Document = document): {
	username: HTMLInputElement | null;
	password: HTMLInputElement | null;
} {
	const [first] = findLoginForms(doc);
	return { username: first?.usernameField ?? null, password: first?.passwordFields[0] ?? null };
}
