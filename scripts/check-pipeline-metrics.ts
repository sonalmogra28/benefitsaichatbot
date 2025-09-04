import { execSync } from 'node:child_process';

export function checkPipelineMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    lintPassed: false,
    testsPassed: false,
    powValid: false,
    buildSuccess: false,
  };

  try {
    execSync('pnpm lint');
    metrics.lintPassed = true;
  } catch (e) {
    console.error('Lint failed');
  }

  try {
    execSync('pnpm test');
    metrics.testsPassed = true;
  } catch (e) {
    console.error('Tests failed');
  }

  try {
    execSync('pnpm validate-pow');
    metrics.powValid = true;
  } catch (e) {
    console.error('PoW validation failed');
  }

  return metrics;
}
