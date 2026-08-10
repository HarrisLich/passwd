import { describe, expect, it } from 'vitest';
import { fillField } from '../lib/autofill/fill';

describe('fillField', () => {
	it('sets the value and dispatches input/change events', () => {
		const input = document.createElement('input');
		document.body.appendChild(input);
		let inputFired = false;
		let changeFired = false;
		input.addEventListener('input', () => (inputFired = true));
		input.addEventListener('change', () => (changeFired = true));

		fillField(input, 'hunter2');

		expect(input.value).toBe('hunter2');
		expect(inputFired).toBe(true);
		expect(changeFired).toBe(true);
	});

	it('bypasses an instance-level shadowed value setter (React-style) via the native prototype setter', () => {
		const input = document.createElement('input');
		document.body.appendChild(input);
		const nativeDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;
		let shadowSetterCalls = 0;

		// Simulates a framework that defines its own instance-level accessor to intercept writes.
		Object.defineProperty(input, 'value', {
			configurable: true,
			get() {
				return nativeDescriptor.get!.call(this);
			},
			set() {
				shadowSetterCalls++;
			}
		});

		fillField(input, 'shadowed-value');

		expect(nativeDescriptor.get!.call(input)).toBe('shadowed-value');
		expect(shadowSetterCalls).toBe(0);
	});
});
