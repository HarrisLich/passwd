import type { DetectedForm } from './detect';

/**
 * React/Vue/Angular shadow the `value` property with their own setter to keep
 * synthetic/virtual DOM state in sync, so a plain `el.value = x` is visually
 * correct but invisible to the framework. Going through the native prototype
 * setter bypasses that shadowing, then dispatching input/change lets the
 * framework's real event listeners observe the change same as a real keystroke.
 */
function setNativeValue(el: HTMLInputElement, value: string): void {
	const proto = Object.getPrototypeOf(el) as typeof HTMLInputElement.prototype;
	const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
	if (setter) {
		setter.call(el, value);
	} else {
		el.value = value;
	}
	el.dispatchEvent(new Event('input', { bubbles: true }));
	el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function fillField(el: HTMLInputElement, value: string): void {
	el.focus();
	setNativeValue(el, value);
	el.dispatchEvent(new Event('blur', { bubbles: true }));
}

export function fillCredentials(
	form: Pick<DetectedForm, 'usernameField' | 'passwordFields'>,
	credentials: { username: string; password: string }
): void {
	if (form.usernameField && credentials.username) fillField(form.usernameField, credentials.username);
	for (const field of form.passwordFields) fillField(field, credentials.password);
}
