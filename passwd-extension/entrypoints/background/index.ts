import { hydrateSession } from '../../lib/session/session.store';
import { handleMessage } from '../../lib/messaging/router';

/** Service worker — session, messaging hub, in-memory vault key (never page world). */
export default defineBackground(() => {
	console.info('[passwd-extension] background service worker started (debug-build-2)');

	chrome.runtime.onInstalled.addListener(() => {
		console.info('[passwd-extension] installed');
	});

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		void (async () => {
			await hydrateSession();
			sendResponse(await handleMessage(message, sender));
		})();
		return true; // keep the message channel open for the async response
	});
});
