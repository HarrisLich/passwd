/** Content script — form detection only; asks background for fill payloads. */
export default defineContentScript({
	matches: ['<all_urls>'],
	main() {
		// TODO: detect login forms; post typed messages to background
	}
});

declare function defineContentScript(opts: {
	matches: string[];
	main: () => void;
}): unknown;
