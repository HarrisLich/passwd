import type { DetectedForm } from '../autofill/detect';
import { classifyForm } from '../autofill/classify';
import { sendMessage } from '../messaging/client';
import type { FormKind, PendingSavePrompt } from '../messaging/protocol';
import { logSave, redact } from './debug-log';

export type SubmissionCandidate = {
	origin: string;
	url: string;
	formKind: FormKind;
	username: string;
	password: string;
};

function describeForm(form: DetectedForm): string {
	const formTag = form.form ? `<form${form.form.id ? `#${form.form.id}` : ''}${form.form.className ? `.${String(form.form.className).split(' ').join('.')}` : ''}>` : 'null';
	const userField = form.usernameField ? `${form.usernameField.tagName}#${form.usernameField.id || '(no id)'}` : 'null';
	return `form=${formTag} usernameField=${userField} passwordFields=${form.passwordFields.length}`;
}

function buildCandidate(form: DetectedForm): SubmissionCandidate | null {
	const password = form.passwordFields.find((f) => f.value.length > 0)?.value;
	if (!password) {
		logSave('buildCandidate: no password field has a value, skipping', describeForm(form));
		return null;
	}
	const candidate = {
		origin: location.origin,
		url: location.href,
		formKind: classifyForm(form),
		username: form.usernameField?.value ?? '',
		password
	};
	logSave('buildCandidate: built', {
		...candidate,
		password: redact(candidate.password),
		username: candidate.username || '(empty)'
	});
	return candidate;
}

async function confirmSubmission(candidate: SubmissionCandidate) {
	logSave('confirmSubmission: sending CAPTURE_SUBMISSION', {
		origin: candidate.origin,
		url: candidate.url,
		formKind: candidate.formKind,
		username: candidate.username || '(empty)',
		password: redact(candidate.password)
	});
	const res = await sendMessage<'CAPTURE_SUBMISSION'>({ type: 'CAPTURE_SUBMISSION', payload: candidate });
	logSave('confirmSubmission: response', res);
	return res;
}

/**
 * Watches one detected form for a submit (button click or `submit` event),
 * then for the form disappearing from the DOM afterward — the SPA success
 * signal. Deliberately does not attempt to handle a traditional full-page
 * navigation submit: that would require correlating this page's submission
 * with a *different* subsequent page load, which turned out to be too
 * unreliable in practice (see save-state.store.ts's comment) and produced
 * false-positive prompts. This only ever fires from the same content-script
 * instance observing its own form, so there's nothing to misattribute.
 */
export function watchForm(form: DetectedForm, onPrompt: (prompt: PendingSavePrompt) => void): () => void {
	let armedCandidate: SubmissionCandidate | null = null;
	let spaTimer: ReturnType<typeof setTimeout> | undefined;
	let observer: MutationObserver | undefined;

	function armSpaWatch() {
		logSave('armSpaWatch: arming MutationObserver on document.body', describeForm(form));
		observer?.disconnect();
		observer = new MutationObserver(() => {
			const stillPresent = form.passwordFields.some((f) => f.isConnected);
			if (stillPresent) return;
			logSave('MutationObserver: password field(s) disconnected from DOM, form considered gone', describeForm(form));
			observer?.disconnect();
			if (spaTimer) clearTimeout(spaTimer);
			spaTimer = setTimeout(() => {
				if (!armedCandidate) {
					logSave('spaTimer fired but armedCandidate is null (already consumed or never set) — skipping');
					return;
				}
				const candidate = armedCandidate;
				armedCandidate = null;
				void confirmSubmission(candidate).then((res) => {
					if ('shouldPrompt' in res && res.shouldPrompt) {
						logSave('showing save prompt', { mode: res.mode, existingItemId: res.existingItemId });
						onPrompt({
							mode: res.mode ?? 'save',
							existingItemId: res.existingItemId,
							username: candidate.username,
							password: candidate.password,
							url: candidate.url
						});
					} else {
						logSave('not showing save prompt (shouldPrompt=false)');
					}
				});
			}, 400);
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	function onSubmitLike(e: Event) {
		logSave('onSubmitLike fired', {
			eventType: e.type,
			eventTarget: e.target instanceof Element ? `${e.target.tagName}#${e.target.id || '(no id)'}.${e.target.className || ''}` : String(e.target),
			watchedForm: describeForm(form)
		});
		const candidate = buildCandidate(form);
		if (!candidate) return;
		armedCandidate = candidate;
		armSpaWatch();
	}

	// Only watch when the fields sit inside a real <form> to scope listeners to.
	// A `submit` event can only ever be dispatched by an actual <form> element, so
	// listening on `document` when there's none can never validly fire for *these*
	// fields — only misattribute some unrelated form's submission elsewhere on the
	// page. The click-target fallback was worse: querying the whole document for
	// `button, input[type=submit]` attached a listener to *every* button on the
	// page (e.g. every row of Google's account-chooser screen), so any unrelated
	// click anywhere triggered this with whatever stale/hidden field values this
	// form group happened to have. Bounded coverage beats broad-but-wrong here.
	if (!form.form) {
		logSave('watchForm: no <form> element, not attaching any listeners', describeForm(form));
		return () => {
			observer?.disconnect();
			if (spaTimer) clearTimeout(spaTimer);
		};
	}

	logSave('watchForm: attaching submit + click listeners scoped to', describeForm(form));
	const target: HTMLFormElement = form.form;
	target.addEventListener('submit', onSubmitLike, true);
	const clickTargets = Array.from(target.querySelectorAll<HTMLElement>('button, input[type="submit"]'));
	logSave(`watchForm: found ${clickTargets.length} button(s)/submit input(s) inside this <form>`);
	for (const btn of clickTargets) btn.addEventListener('click', onSubmitLike, true);

	return () => {
		target.removeEventListener('submit', onSubmitLike, true);
		for (const btn of clickTargets) btn.removeEventListener('click', onSubmitLike, true);
		observer?.disconnect();
		if (spaTimer) clearTimeout(spaTimer);
	};
}
