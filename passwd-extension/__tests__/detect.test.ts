import { describe, expect, it, beforeEach } from 'vitest';
import { findLoginForms } from '../lib/autofill/detect';

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('findLoginForms', () => {
	it('pairs a username field with its password field inside a login form', () => {
		document.body.innerHTML = `
			<form id="login">
				<input type="email" name="email" autocomplete="username" />
				<input type="password" name="password" autocomplete="current-password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(form.usernameField).not.toBeNull();
		expect(form.usernameField?.getAttribute('name')).toBe('email');
		expect(form.passwordFields).toHaveLength(1);
	});

	it('groups two password fields (signup + confirm) into one form', () => {
		document.body.innerHTML = `
			<form id="signup">
				<input type="text" name="username" />
				<input type="password" name="password" autocomplete="new-password" />
				<input type="password" name="confirm" autocomplete="new-password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(form.passwordFields).toHaveLength(2);
		expect(form.usernameField?.getAttribute('name')).toBe('username');
	});

	it('keeps unrelated forms on the same page separate', () => {
		document.body.innerHTML = `
			<form id="login">
				<input type="email" name="email" />
				<input type="password" name="password" />
			</form>
			<form id="newsletter">
				<input type="email" name="newsletter-email" />
			</form>
		`;
		const forms = findLoginForms(document);
		// The login form (password-anchored) and the newsletter's lone email field
		// (identifier-only, strong signal) are detected as two distinct forms —
		// neither absorbs the other's fields.
		expect(forms).toHaveLength(2);
		const login = forms.find((f) => f.passwordFields.length > 0);
		expect(login?.usernameField?.getAttribute('name')).toBe('email');
		const newsletter = forms.find((f) => f.passwordFields.length === 0);
		expect(newsletter?.usernameField?.getAttribute('name')).toBe('newsletter-email');
	});

	it('detects a password-less identifier step (Google/Microsoft-style multi-step login)', () => {
		document.body.innerHTML = `
			<form>
				<input type="email" id="identifierId" autocomplete="username" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(form.passwordFields).toHaveLength(0);
		expect(form.usernameField?.id).toBe('identifierId');
	});

	it('matches multi-token autocomplete values, e.g. accounts.google.com\'s real markup (type="text", autocomplete="username webauthn")', () => {
		document.body.innerHTML = `
			<form>
				<input type="text" id="identifierId" name="identifier" autocomplete="username webauthn" aria-label="Email or phone" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(form.passwordFields).toHaveLength(0);
		expect(form.usernameField?.id).toBe('identifierId');
	});

	it('does not treat a weak-signal lone text field as an identifier step', () => {
		document.body.innerHTML = `
			<form>
				<input type="text" name="search" placeholder="Search the site" />
			</form>
		`;
		expect(findLoginForms(document)).toHaveLength(0);
	});

	it('ignores hidden password fields', () => {
		document.body.innerHTML = `
			<form>
				<input type="password" name="hidden-password" style="display: none;" />
			</form>
		`;
		expect(findLoginForms(document)).toHaveLength(0);
	});

	it('falls back to document.body grouping when a password field is outside a <form>', () => {
		document.body.innerHTML = `
			<div>
				<input type="text" name="user" />
				<input type="password" name="pass" />
			</div>
		`;
		const [form] = findLoginForms(document);
		expect(form.form).toBeNull();
		expect(form.usernameField?.getAttribute('name')).toBe('user');
	});
});
