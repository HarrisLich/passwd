import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

const apiProxy = {
	target: 'http://127.0.0.1:8787',
	changeOrigin: true
};

export default defineConfig({
	// Works around https://github.com/vitejs/vite/issues/21969: Rolldown's SSR build
	// defaults build.rolldownOptions.platform to 'node' even when ssr.target is
	// 'webworker' (set by adapter-cloudflare), emitting createRequire(import.meta.url)
	// for CJS interop — import.meta.url is undefined in Cloudflare's bundled Worker
	// module scope, so that throws at startup ("Received 'undefined'", API code 10021).
	// Forcing 'neutral' stops Rolldown from emitting the Node-only interop shim.
	environments: {
		ssr: {
			build: {
				rolldownOptions: {
					platform: 'neutral'
				}
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	server: {
		proxy: {
			'/api': apiProxy,
			'/v1': apiProxy,
			'/health': apiProxy
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
