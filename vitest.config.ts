import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
