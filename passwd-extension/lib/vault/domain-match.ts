import { getDomain } from 'tldts';

/**
 * Registrable-domain (eTLD+1, via the Public Suffix List) equality — a saved
 * item for "google.com" matches "accounts.google.com", "mail.google.com",
 * etc. Deliberately NOT a naive "last two labels of the hostname" check:
 * that would mishandle multi-part public suffixes like .co.uk, wrongly
 * treating unrelated sites (e.g. bank.co.uk and evil.co.uk) as the same
 * domain — a real credential-leak risk, not just a cosmetic bug. getDomain()
 * returns null for bare suffixes/invalid input, which safely never matches.
 *
 * This still won't bridge genuinely separate registered domains used by the
 * same provider (e.g. gmail.com vs. accounts.google.com) — that needs a
 * curated alias list, deliberately out of scope here.
 */
export function sameRegistrableDomain(a: string, b: string): boolean {
	const domainA = getDomain(a);
	const domainB = getDomain(b);
	return domainA !== null && domainA === domainB;
}
