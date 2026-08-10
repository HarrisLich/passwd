import { defineConfig } from 'wxt';

// Pin a stable dev extension id (chrome-extension://<id>) so the server's
// EXTENSION_ORIGIN allowlist doesn't need updating on every reload. Generate your
// own keypair locally and set WXT_EXTENSION_DEV_KEY — never commit a real key here.
const devKey = process.env.WXT_EXTENSION_DEV_KEY;

export default defineConfig({
	srcDir: '.',
	entrypointsDir: 'entrypoints',
	// This environment can't auto-launch a browser for `wxt dev` — load the built
	// .output/chrome-mv3 folder manually via chrome://extensions instead.
	runner: { disabled: true },
	manifest: {
		name: 'Passwd',
		description: 'Zero-knowledge password manager autofill',
		permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
		host_permissions: ['<all_urls>'],
		// passwd-crypto's Argon2id KDF (hash-wasm) compiles a WASM module in the background
		// service worker during unlock — MV3's default CSP omits 'wasm-unsafe-eval', which
		// blocks that compile. Must be declared explicitly for production builds.
		content_security_policy: {
			extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
		},
		...(devKey ? { key: devKey } : {})
	}
});
