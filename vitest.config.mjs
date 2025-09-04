import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',

      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'lib/auth/session.ts',
        'app/api/chat/route.ts',
        'lib/payments/**',
        'lib/firebase/services/document-client.service.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    resolveSnapshotPath: (testPath, snapExtension) =>
      path.resolve(__dirname, '__snapshots__', `${testPath}${snapExtension}`),
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {
    'process.env.NEXT_PUBLIC_STACK_PROJECT_ID':
      JSON.stringify('test-project-id'),
    'process.env.STACK_SECRET_SERVER_KEY': JSON.stringify('test-secret-key'),
    'process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY':
      JSON.stringify('test-client-key'),
  },
});
