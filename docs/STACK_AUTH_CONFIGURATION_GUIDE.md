# Stack Auth Configuration Guide

## Current Issue

There's a mismatch between Stack Auth project IDs in different environments:
- **Local (.env.local):** `4fd7aa3d-35e6-49a6-a2f3-aafc45ae5cd9`
- **Vercel (reported):** `1f39c103-a9ed-4bb9-a258-f9d5823e3c82`

This mismatch will cause authentication failures when deployed to production.

## Resolution Steps

### 1. Verify Correct Project ID

First, determine which Stack Auth project ID is correct:

1. Log into your Stack Auth dashboard at https://app.stack-auth.com
2. Navigate to your project settings
3. Copy the correct Project ID

### 2. Update Environment Variables

#### Local Development (.env.local)
```bash
NEXT_PUBLIC_STACK_PROJECT_ID=<correct-project-id>
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<correct-client-key>
STACK_SECRET_SERVER_KEY=<correct-server-key>
```

#### Vercel Production
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Update the following variables for Production environment:
   - `NEXT_PUBLIC_STACK_PROJECT_ID`
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
   - `STACK_SECRET_SERVER_KEY`

### 3. Additional Environment Variables Needed

Add these missing environment variables to both local and Vercel:

```bash
# Stack Auth Configuration
NEXT_PUBLIC_STACK_URL=https://your-app-domain.com

# Cron Job Security
CRON_SECRET=<generate-secure-random-string>

# Internal API Key (for service-to-service auth)
INTERNAL_API_KEY=<generate-secure-api-key>

# AI Configuration
XAI_API_KEY=<your-xai-api-key>
XAI_MODEL=grok-2-1212
```

### 4. Generate Secure Secrets

To generate secure secrets, use:

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate INTERNAL_API_KEY
openssl rand -hex 32
```

### 5. Update stack.ts Configuration

Ensure your `/stack.ts` file uses the correct environment variables:

```typescript
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: process.env.NEXT_PUBLIC_STACK_URL || 'http://localhost:3000',
    signIn: "/signin",
    signUp: "/signup",
    afterSignIn: "/chat",
    afterSignUp: "/onboarding",
    afterSignOut: "/",
  },
});
```

### 6. Fix Handler Implementation

Update `/app/handler/[...stack]/route.ts`:

```typescript
import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';

const handler = StackHandler({
  app: stackServerApp,
});

export { handler as GET, handler as POST };
```

Remove the page-based handler at `/app/handler/[...stack]/page.tsx` if it exists.

### 7. Verify Configuration

After updating all environment variables:

1. Restart your local development server
2. Clear browser cookies/cache
3. Test authentication flow:
   - Sign up
   - Sign in
   - Sign out
   - Protected route access

### 8. Deploy and Test

1. Deploy to Vercel: `vercel --prod`
2. Test authentication in production
3. Monitor logs for any authentication errors

## Troubleshooting

### Common Issues

1. **"Invalid project ID" error**
   - Ensure all Stack Auth environment variables match
   - Check for typos in project ID

2. **"Unauthorized" on protected routes**
   - Clear cookies and re-authenticate
   - Verify middleware is using correct auth checks

3. **Different behavior local vs production**
   - Compare environment variables between environments
   - Ensure all required variables are set in Vercel

### Debug Commands

```bash
# Check current environment variables
npm run env:check

# Validate Stack Auth configuration
npm run auth:validate
```

## Security Checklist

- [ ] All Stack Auth keys are kept secret (not in git)
- [ ] CRON_SECRET is set and secure
- [ ] INTERNAL_API_KEY is set for service auth
- [ ] All admin endpoints use authentication
- [ ] Environment variables are set in Vercel
- [ ] Production uses HTTPS only

## Next Steps

1. Complete environment variable updates
2. Test authentication thoroughly
3. Run security audit: `npm run security:audit`
4. Document any custom Stack Auth configurations