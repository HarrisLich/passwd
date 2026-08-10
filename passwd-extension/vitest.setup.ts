// jsdom doesn't run a real layout engine, so every element's getBoundingClientRect()
// is {0,0,0,0} by default — that would make lib/autofill/detect.ts's visibility check
// (rect.width/height > 0) treat every element as hidden. Stub a fixed non-zero rect so
// tests exercise the CSS-based part of that check (display/visibility/opacity), which
// jsdom does support via inline styles.
HTMLElement.prototype.getBoundingClientRect = function (): DOMRect {
	return {
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 200,
		bottom: 24,
		width: 200,
		height: 24,
		toJSON() {
			return this;
		}
	} as DOMRect;
};
