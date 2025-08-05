# Stack Auth Fix Plan

## Option 1: Quick Fixes (Recommended)

### 1. Sync Environment Variables
Ensure `.env.local` matches what's in Vercel:
```env
NEXT_PUBLIC_STACK_PROJECT_ID=1f39c103-a9ed-4bb9-a258-f9d5823e3c82
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_hvbjs2tm1y8myshkt6k03m3y64rjt11zpznnt3jmeab70
STACK_SECRET_SERVER_KEY=ssk_c2fy0wpxqz0zzcdr464kxdwp5cq570sbve1mwj092tcwr
```

### 2. Simplify Auth Helper
Remove tenant context from the auth flow - handle it separately after authentication succeeds.

### 3. Fix Sign-out
Ensure cookies are properly cleared on sign-out.

### 4. Add Better Error Handling
Add try-catch blocks and logging to identify exactly where auth is failing.

## Option 2: Clean Reinstall (If Quick Fixes Don't Work)

If the quick fixes don't resolve the issues, then a clean reinstall might be warranted:

1. **Backup Current Implementation**
   - Save custom auth logic (onboarding, user mapping)
   - Document current database schema

2. **Remove Stack Auth**
   ```bash
   npm uninstall @stackframe/stack
   rm -rf app/handler
   rm stack.ts
   ```

3. **Reinstall with Wizard**
   ```bash
   npx @stackframe/init-stack@latest
   ```

4. **Restore Custom Logic**
   - Re-implement user-company mapping
   - Restore onboarding flow
   - Add back tenant context (separately from auth)

## My Recommendation

Try Option 1 first. The implementation is 90% correct - we just need to fix:
- Environment variable sync
- Simplify the auth helper
- Fix sign-out cookie clearing

This should take 30-60 minutes vs several hours for a complete reinstall.