import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: '.',
	entrypointsDir: 'entrypoints',
	manifest: {
		name: 'Passwd',
		description: 'Zero-knowledge password manager autofill',
		permissions: ['storage', 'activeTab', 'scripting'],
		host_permissions: ['<all_urls>']
	}
});
