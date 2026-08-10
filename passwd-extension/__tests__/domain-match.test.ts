import { describe, expect, it } from 'vitest';
import { sameRegistrableDomain } from '../lib/vault/domain-match';

describe('sameRegistrableDomain', () => {
	it('matches a bare domain against its own subdomain', () => {
		expect(sameRegistrableDomain('google.com', 'accounts.google.com')).toBe(true);
	});

	it('matches full URLs against a bare saved domain, regardless of scheme/path', () => {
		expect(sameRegistrableDomain('https://accounts.google.com/v3/signin', 'google.com')).toBe(true);
	});

	it('does not match unrelated domains', () => {
		expect(sameRegistrableDomain('accounts.google.com', 'gmail.com')).toBe(false);
	});

	it('does not treat a shared multi-part public suffix as a match (co.uk)', () => {
		expect(sameRegistrableDomain('mybank.co.uk', 'evil.co.uk')).toBe(false);
	});

	it('still matches subdomains under a multi-part public suffix', () => {
		expect(sameRegistrableDomain('login.mybank.co.uk', 'mybank.co.uk')).toBe(true);
	});

	it('returns false for invalid/empty input rather than throwing', () => {
		expect(sameRegistrableDomain('', 'google.com')).toBe(false);
		expect(sameRegistrableDomain('not a url', 'google.com')).toBe(false);
	});
});
