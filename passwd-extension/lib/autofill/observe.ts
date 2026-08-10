/** Debounced MutationObserver so SPA re-renders re-trigger form detection without hammering it on every DOM tick. */
export function observeMutations(target: Node, callback: () => void, debounceMs = 250): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const observer = new MutationObserver(() => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(callback, debounceMs);
	});
	observer.observe(target, { childList: true, subtree: true });
	return () => {
		if (timer) clearTimeout(timer);
		observer.disconnect();
	};
}
