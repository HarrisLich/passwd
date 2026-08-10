import type { FormKind, PendingSavePrompt } from '../messaging/protocol';
import { isVaultUnlocked } from '../session/session.store';
import { logSave } from './debug-log';

/**
 * Background-side save/update state machine. Dismissals are session-scoped
 * and in-memory only (lost on a service-worker restart — acceptable for a
 * "don't ask again this browsing session" convenience, not a security
 * boundary).
 *
 * Deliberately SPA-confirm only — no cross-page-load candidate pinning. An
 * earlier version pinned a "candidate" on submit and resolved it against
 * whatever full page load happened next on the same tab, using "did the URL
 * change" as a proxy for "did the submission succeed." That heuristic kept
 * producing false positives: any unrelated later navigation on the same tab
 * (e.g. testing a different page within the TTL window) got misattributed as
 * the result of an earlier submission, surfacing a stale or blank-looking
 * prompt. The SPA-confirm path below has no such ambiguity — the content
 * script directly observes its own form disappearing from the DOM on the
 * same page, in the same instance, so there's nothing to misattribute. The
 * tradeoff: a traditional full-page-navigation submit (no SPA routing) won't
 * trigger a save prompt, since the content script that captured the
 * submission doesn't survive the navigation to confirm it succeeded.
 */

export type SubmissionCandidate = {
	origin: string;
	url: string;
	formKind: FormKind;
	username: string;
	password: string;
};

type FindExisting = (origin: string, username: string) => Promise<{ id: string } | null>;

const dismissed = new Set<string>();

function dismissalKey(origin: string, username: string): string {
	return `${origin}|${username.toLowerCase()}`;
}

export function isDismissed(origin: string, username: string): boolean {
	return dismissed.has(dismissalKey(origin, username));
}

export function dismiss(origin: string, username: string, scope: 'this-time' | 'session'): void {
	if (scope === 'session') dismissed.add(dismissalKey(origin, username));
}

/** The content script itself observed the form disappear after a real submit — no cross-navigation handshake needed. */
export async function resolveConfirmedSubmission(
	candidate: SubmissionCandidate,
	findExisting: FindExisting
): Promise<PendingSavePrompt | null> {
	if (!candidate.password) {
		logSave('resolveConfirmedSubmission: candidate has no password, returning null');
		return null;
	}
	if (isDismissed(candidate.origin, candidate.username)) {
		logSave('resolveConfirmedSubmission: dismissed for', candidate.origin, candidate.username || '(empty)');
		return null;
	}

	// The vault must be unlocked to know save-vs-update or to persist anything at all — this is
	// also the bootstrapping case (signing up for a passwd account itself, before any vault exists).
	// The generated password is still recoverable from generator history regardless of lock state.
	if (!isVaultUnlocked()) {
		logSave('resolveConfirmedSubmission: vault locked, returning locked prompt');
		return {
			mode: 'locked',
			username: candidate.username,
			password: candidate.password,
			url: candidate.url
		};
	}

	const existing = await findExisting(candidate.origin, candidate.username);
	logSave('resolveConfirmedSubmission: existing match?', existing);
	return {
		mode: existing ? 'update' : 'save',
		existingItemId: existing?.id,
		username: candidate.username,
		password: candidate.password,
		url: candidate.url
	};
}
