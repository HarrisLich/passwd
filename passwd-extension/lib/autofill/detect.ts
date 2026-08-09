/** Heuristics for username/password fields — keep out of page-world key handling. */
export function findLoginFields(_doc: Document): {
	username: HTMLInputElement | null;
	password: HTMLInputElement | null;
} {
	return { username: null, password: null };
}
