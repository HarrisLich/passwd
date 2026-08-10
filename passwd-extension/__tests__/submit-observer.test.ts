import { describe, expect, it, vi, beforeEach } from 'vitest';
import { watchForm } from '../lib/save-detection/submit-observer';
import type { DetectedForm } from '../lib/autofill/detect';

beforeEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('watchForm', () => {
	it('does not react to an unrelated form submitting elsewhere on the page when its own fields are not inside a <form>', () => {
		document.body.innerHTML = `
			<div id="widget"><input type="password" id="pw" /></div>
			<form id="unrelated"><button type="submit">Go</button></form>
		`;
		const pw = document.getElementById('pw') as HTMLInputElement;
		pw.value = 'leaked-if-buggy';
		const detected: DetectedForm = { form: null, usernameField: null, passwordFields: [pw] };

		const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
		const onPrompt = vi.fn();
		const detach = watchForm(detected, onPrompt);

		const unrelatedForm = document.getElementById('unrelated') as HTMLFormElement;
		unrelatedForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

		// Previously: falling back to `document` for the submit/click listeners meant this
		// unrelated form's submission (or a click on *any* button anywhere on the page) would
		// arm the SPA watch using this widget's stale/hidden field values — exactly what
		// produced the false-positive "empty" save prompt on Google's account-chooser page.
		expect(observeSpy).not.toHaveBeenCalled();
		detach();
	});

	it('still watches normally when the fields are inside a real <form>', () => {
		document.body.innerHTML = `
			<form id="real">
				<input type="password" id="pw" />
				<button type="submit">Go</button>
			</form>
		`;
		const pw = document.getElementById('pw') as HTMLInputElement;
		pw.value = 'hunter2';
		const formEl = document.getElementById('real') as HTMLFormElement;
		const detected: DetectedForm = { form: formEl, usernameField: null, passwordFields: [pw] };

		const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
		const onPrompt = vi.fn();
		const detach = watchForm(detected, onPrompt);

		formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

		expect(observeSpy).toHaveBeenCalled();
		detach();
	});
});
