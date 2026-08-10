import { describe, expect, it } from 'vitest';
import { generatePassword } from '../lib/generator/generator';

describe('generatePassword', () => {
	it('generates a password of the requested length', () => {
		expect(generatePassword({ length: 16 })).toHaveLength(16);
		expect(generatePassword({ length: 40 })).toHaveLength(40);
	});

	it('clamps length to [4, 128]', () => {
		expect(generatePassword({ length: 1 })).toHaveLength(4);
		expect(generatePassword({ length: 1000 })).toHaveLength(128);
	});

	it('only uses characters from the enabled pools', () => {
		const password = generatePassword({
			length: 64,
			options: { upper: false, lower: true, digits: false, symbols: false }
		});
		expect(password).toMatch(/^[a-km-z]+$/);
	});

	it('falls back to lowercase when every pool is disabled', () => {
		const password = generatePassword({
			length: 20,
			options: { upper: false, lower: false, digits: false, symbols: false }
		});
		expect(password).toMatch(/^[a-km-z]+$/);
	});

	it('does not repeat the same password across calls (statistically)', () => {
		const passwords = new Set(Array.from({ length: 20 }, () => generatePassword({ length: 24 })));
		expect(passwords.size).toBe(20);
	});
});
