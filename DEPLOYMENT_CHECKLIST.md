# Deployment Checklist & Verification Process

This checklist MUST be completed before ANY deployment attempt. After 89 failed deployments, we need a rigorous process.

## Pre-Deployment Verification Process

### 1. Local Build Test (MANDATORY)
```bash
# Clean everything first
rm -rf .next node_modules
pnpm install

# Run ALL checks
pnpm typecheck
pnpm lint
pnpm build
```

**✅ PASS CRITERIA**: All commands must complete with exit code 0

### 2. TypeScript Check
```bash
pnpm typecheck
```
**✅ PASS CRITERIA**: Zero TypeScript errors (warnings are acceptable)

### 3. ESLint Check
```bash
pnpm lint
```
**✅ PASS CRITERIA**: No errors (warnings are acceptable)

### 4. Build Test
```bash
pnpm build
```
**✅ PASS CRITERIA**: 
- Build completes successfully
- No "Failed to compile" errors
- Exit code 0

### 5. API Route Validation
Check all dynamic route handlers follow Next.js 15 format:

```typescript
// CORRECT format for Next.js 15:
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}

// WRONG format (will fail):
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // This will fail in Next.js 15!
}
```

### 6. Environment Variables Check
Verify all required env vars are in Vercel:
- [ ] DATABASE_URL
- [ ] POSTGRES_URL
- [ ] STACK_PROJECT_ID
- [ ] STACK_PUBLISHABLE_CLIENT_KEY
- [ ] STACK_SECRET_SERVER_KEY
- [ ] NEXT_PUBLIC_STACK_PROJECT_ID
- [ ] NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
- [ ] OPENAI_API_KEY
- [ ] PINECONE_API_KEY
- [ ] PINECONE_INDEX_NAME
- [ ] RESEND_API_KEY
- [ ] BLOB_READ_WRITE_TOKEN

### 7. Database Schema Check
```bash
pnpm db:generate
```
**✅ PASS CRITERIA**: No pending migrations

### 8. Dependency Check
```bash
pnpm outdated
```
**✅ PASS CRITERIA**: No major breaking changes in dependencies

### 9. Import Check
Search for any incorrect imports:
- No circular dependencies
- All imports resolve correctly
- No missing modules

### 10. Route Handler Format Check
All API routes must use the new Next.js 15 format with async params.

## Common Failure Points

### 1. Dynamic Route Parameters (MOST COMMON)
Next.js 15 requires `params` to be a Promise in dynamic routes:
```typescript
// Update ALL occurrences of this pattern
{ params }: { params: Promise<{ id: string }> }
```

### 2. Missing Environment Variables
- Always verify in Vercel dashboard
- Check for typos in variable names

### 3. TypeScript Errors
- Run `pnpm typecheck` before EVERY commit
- Fix ALL errors, not just some

### 4. Database Schema Mismatches
- Always run migrations before deployment
- Ensure schema matches production

### 5. Build-Time vs Runtime Errors
- Build errors = immediate failure
- Runtime errors = delayed failure
- Focus on build errors first

## Automated Pre-Deployment Script

Create this script as `scripts/pre-deploy-check.ts`:

```typescript
#!/usr/bin/env tsx
import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('🔍 Running pre-deployment checks...\n'));

const checks = [
  {
    name: 'TypeScript Check',
    command: 'pnpm typecheck',
    critical: true
  },
  {
    name: 'ESLint Check',
    command: 'pnpm lint',
    critical: true
  },
  {
    name: 'Build Check',
    command: 'pnpm build',
    critical: true
  }
];

let failed = false;

for (const check of checks) {
  console.log(chalk.yellow(`Running ${check.name}...`));
  try {
    execSync(check.command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${check.name} passed\n`));
  } catch (error) {
    console.log(chalk.red(`❌ ${check.name} failed\n`));
    if (check.critical) {
      failed = true;
    }
  }
}

if (failed) {
  console.log(chalk.red('❌ Pre-deployment checks failed. Fix errors before deploying.'));
  process.exit(1);
} else {
  console.log(chalk.green('✅ All checks passed! Safe to deploy.'));
}
```

Add to package.json:
```json
"scripts": {
  "pre-deploy": "tsx scripts/pre-deploy-check.ts"
}
```

## Deployment Process

1. **NEVER deploy without running checks**:
   ```bash
   pnpm pre-deploy
   ```

2. **If checks fail**, fix ALL errors before proceeding

3. **Commit fixes**:
   ```bash
   git add -A
   git commit -m "fix: pre-deployment fixes"
   ```

4. **Run checks again**:
   ```bash
   pnpm pre-deploy
   ```

5. **Only push if ALL checks pass**:
   ```bash
   git push
   ```

## Emergency Fixes

If deployment fails even after checks:

1. Check Vercel build logs for the EXACT error
2. Search for the error pattern in codebase
3. Fix locally
4. Run `pnpm pre-deploy` again
5. Test the specific fix:
   ```bash
   pnpm build
   ```

## Setting Up CI/CD Protection

Add `.github/workflows/pre-deploy.yml`:

```yaml
name: Pre-deployment Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: pnpm/action-setup@v2
      with:
        version: 9.12.3
        
    - uses: actions/setup-node@v3
      with:
        node-version: 20
        cache: 'pnpm'
        
    - run: pnpm install
    
    - name: TypeScript Check
      run: pnpm typecheck
      
    - name: Lint Check
      run: pnpm lint
      
    - name: Build Check
      run: pnpm build
```

## Never Deploy If:
- ❌ TypeScript errors exist
- ❌ Build fails locally
- ❌ ESLint has errors (not warnings)
- ❌ Dynamic routes use old format
- ❌ Environment variables are missing
- ❌ Database migrations are pending

## Always Deploy After:
- ✅ `pnpm pre-deploy` passes
- ✅ All dynamic routes use Promise<params>
- ✅ Environment variables are verified
- ✅ Local build succeeds
- ✅ TypeScript has zero errors

Remember: It's better to fix locally for 30 minutes than to have 89 failed deployments!