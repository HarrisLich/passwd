import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.test.ts', 'lib/**/*.test.ts'],
		setupFiles: ['./vitest.setup.ts']
	}
});
