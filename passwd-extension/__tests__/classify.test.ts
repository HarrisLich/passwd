import { describe, expect, it, beforeEach } from 'vitest';
import { findLoginForms } from '../lib/autofill/detect';
import { classifyForm } from '../lib/autofill/classify';

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('classifyForm', () => {
	it('classifies a single current-password field as login', () => {
		document.body.innerHTML = `
			<form>
				<input type="email" name="email" />
				<input type="password" name="password" autocomplete="current-password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('login');
	});

	it('classifies a new-password field as signup', () => {
		document.body.innerHTML = `
			<form>
				<input type="email" name="email" />
				<input type="password" name="password" autocomplete="new-password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('signup');
	});

	it('classifies two password fields with current+new autocomplete as change-password', () => {
		document.body.innerHTML = `
			<form>
				<input type="password" name="old" autocomplete="current-password" />
				<input type="password" name="new" autocomplete="new-password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('change-password');
	});

	it('classifies two password fields with no hints as signup (password + confirm)', () => {
		document.body.innerHTML = `
			<form>
				<input type="text" name="username" />
				<input type="password" name="password" />
				<input type="password" name="confirm" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('signup');
	});

	it('classifies a multi-token autocomplete value (e.g. "current-password webauthn") as login', () => {
		document.body.innerHTML = `
			<form>
				<input type="email" name="email" />
				<input type="password" name="password" autocomplete="current-password webauthn" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('login');
	});

	it('classifies via nearby signup copy when there are no autocomplete hints', () => {
		document.body.innerHTML = `
			<form>
				<h1>Create account</h1>
				<input type="email" name="email" />
				<input type="password" name="password" />
			</form>
		`;
		const [form] = findLoginForms(document);
		expect(classifyForm(form, document)).toBe('signup');
	});
});
