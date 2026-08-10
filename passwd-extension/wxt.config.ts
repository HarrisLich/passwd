import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'wxt';

// wxt.config.ts is evaluated before WXT's own .env loading runs (confirmed empirically —
// process.env.WXT_EXTENSION_DEV_KEY isn't populated here even though .env.local exists),
// so read it ourselves rather than relying on that.
function readEnvLocal(key: string): string | undefined {
	if (!existsSync('.env.local')) return undefined;
	const line = readFileSync('.env.local', 'utf8')
		.split(/\r?\n/)
		.find((l) => l.startsWith(`${key}=`));
	return line?.slice(key.length + 1).trim();
}

// Pin a stable extension id (chrome-extension://<id>) so it matches passwd-server's
// EXTENSION_ORIGIN allowlist on every machine, with no per-device reconfiguration.
// .env.local is committed on purpose — see its own comment for why that's safe here.
const devKey = process.env.WXT_EXTENSION_DEV_KEY || readEnvLocal('WXT_EXTENSION_DEV_KEY');

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
