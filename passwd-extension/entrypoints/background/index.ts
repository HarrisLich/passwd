/** Service worker — session, messaging hub, in-memory vault key (never page world). */
export default defineBackground(() => {
	chrome.runtime.onInstalled.addListener(() => {
		console.info('[passwd-extension] installed');
	});
});

// WXT injects defineBackground; keep stub typed loosely until `wxt prepare`.
declare function defineBackground(fn: () => void): unknown;
