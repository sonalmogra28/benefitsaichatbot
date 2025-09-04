#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

console.log('🔍 Running pre-deployment checks...\n');

const checks = [
  {
    name: 'TypeScript Check',
    command: 'pnpm typecheck',
    critical: true,
  },
  {
    name: 'ESLint Check',
    command: 'pnpm lint',
    critical: true,
  },
  {
    name: 'Build Check',
    command: 'pnpm build',
    critical: true,
  },
];

let failed = false;

for (const check of checks) {
  console.log(`Running ${check.name}...`);
  try {
    execSync(check.command, { stdio: 'inherit' });
    console.log(`✅ ${check.name} passed\n`);
  } catch (error) {
    console.log(`❌ ${check.name} failed\n`);
    if (check.critical) {
      failed = true;
    }
  }
}

if (failed) {
  console.log('❌ Pre-deployment checks failed. Fix errors before deploying.');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Safe to deploy.');
}
