import type { GeneratorOptions } from '../messaging/protocol';

/** Ambiguous glyphs (I/l/1, O/0) dropped so generated passwords are easy to read/retype if needed. */
const CHARSETS: Record<keyof GeneratorOptions, string> = {
	upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
	lower: 'abcdefghijkmnopqrstuvwxyz',
	digits: '23456789',
	symbols: '!@#$%^&*-_=+?'
};

const DEFAULT_OPTIONS: GeneratorOptions = { upper: true, lower: true, digits: true, symbols: true };
const DEFAULT_LENGTH = 20;

/** crypto.getRandomValues-backed, modulo-bias-safe index into [0, max) — never Math.random. */
function randomIndex(max: number): number {
	const range = 256 - (256 % max);
	const bytes = new Uint8Array(1);
	let value: number;
	do {
		crypto.getRandomValues(bytes);
		value = bytes[0];
	} while (value >= range);
	return value % max;
}

export function generatePassword(input?: { length?: number; options?: Partial<GeneratorOptions> }): string {
	const options = { ...DEFAULT_OPTIONS, ...input?.options };
	const length = Math.max(4, Math.min(128, input?.length ?? DEFAULT_LENGTH));
	const pools = (Object.keys(CHARSETS) as (keyof GeneratorOptions)[])
		.filter((key) => options[key])
		.map((key) => CHARSETS[key]);
	if (pools.length === 0) pools.push(CHARSETS.lower);
	const alphabet = pools.join('');

	const chars: string[] = [];
	// Guarantee at least one char from each selected pool, then fill the rest from the combined alphabet.
	for (const pool of pools) {
		if (chars.length >= length) break;
		chars.push(pool[randomIndex(pool.length)]);
	}
	while (chars.length < length) {
		chars.push(alphabet[randomIndex(alphabet.length)]);
	}

	// Fisher-Yates shuffle so the guaranteed-pool chars aren't always at the front.
	for (let i = chars.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}

	return chars.slice(0, length).join('');
}
