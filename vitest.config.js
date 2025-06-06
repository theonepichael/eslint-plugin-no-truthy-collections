import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Disable worker pools for Bun compatibility
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Set reasonable timeout
    testTimeout: 10000,
    // Include test files explicitly
    include: ['tests/**/*.test.js'],
  },
});
