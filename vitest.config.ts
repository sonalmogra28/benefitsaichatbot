import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
    },
    resolveSnapshotPath: (testPath, snapExtension) =>
      resolve(__dirname, '__snapshots__', `${testPath}${snapExtension}`),
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'tests/e2e/**',
      'tests/routes/**',
      'tests/db/**',
    ],
    env: {
      NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
      STACK_SECRET_SERVER_KEY: 'test-secret-key',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test-client-key',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
