# Stack Auth Integration Audit & Implementation Plan

## Table of Contents
1. [Comprehensive Review Plan](#comprehensive-review-plan)
2. [Stack Auth Requirements](#stack-auth-requirements)
3. [Multi-Tenancy Requirements](#multi-tenancy-requirements)
4. [Verification Approach](#verification-approach)
5. [Production-Ready Solution](#production-ready-solution)
6. [Common Pitfalls & High-Risk Areas](#common-pitfalls--high-risk-areas)
7. [Implementation Checklist](#implementation-checklist)
8. [Test Results](#test-results)

---

## Comprehensive Review Plan

### Phase 1: Stack Auth Documentation Review ✅
- [x] Review Stack Auth Next.js App Router documentation
- [x] Identify correct handler export pattern
- [x] Understand cookie/session management requirements
- [x] Review environment variable requirements

### Phase 2: Current Implementation Audit ✅
- [x] Analyze current handler implementation - Found: StackHandler needs fullPage param
- [x] Review middleware configuration - Simplified, passes through all requests
- [x] Check environment variable setup - All 3 vars present in .env.local
- [x] Verify Stack app configuration - URLs correctly configured
- [x] Audit auth helper functions - Properly maps Stack users to local DB
- [x] Review protected route implementations - Uses redirect() for protection

### Phase 3: Multi-Tenancy Integration Review
- [ ] Verify user-company associations
- [ ] Check tenant isolation in queries
- [ ] Review role-based access control
- [ ] Validate company-scoped data access

### Phase 4: Testing Strategy
- [ ] Local build test
- [ ] Authentication flow test
- [ ] Multi-tenant isolation test
- [ ] Role-based access test

---

## Stack Auth Requirements

### 1. Handler Route Requirements
- Must export handlers directly from Stack app (no wrapping)
- Route must be at `/handler/[...stack]`
- Must support both GET and POST methods

### 2. Environment Variables
```env
NEXT_PUBLIC_STACK_PROJECT_ID=        # Required for client
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=  # Required for client
STACK_SECRET_SERVER_KEY=             # Required for server
```

### 3. Stack App Configuration
```typescript
new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/login",
    signUp: "/register", 
    afterSignIn: "/",
    afterSignUp: "/onboarding",
    afterSignOut: "/"
  }
})
```

### 4. Cookie Requirements
- Must use `tokenStore: "nextjs-cookie"`
- Cookies must be accessible server-side
- Domain must match deployment URL

---

## Multi-Tenancy Requirements

### 1. User Model
- Each user belongs to exactly one company
- User roles: employee, hr_admin, company_admin, platform_admin
- Platform admins have cross-company access

### 2. Data Isolation
- All queries must filter by companyId
- Exception: platform_admin can access all data
- Tenant context must be established from authenticated user

### 3. Authentication Flow
1. User signs in via Stack Auth
2. Stack user ID mapped to local user record
3. User's company and role loaded from database
4. Tenant context established for session

---

## Verification Approach

### Why Previous Attempts Failed
1. **Incorrect Handler Pattern**: Wrapped handlers instead of direct export
2. **Type Mismatch**: stackServerApp doesn't directly export GET/POST
3. **Missing Handler Creation**: Need to create handler from app first
4. **Build Testing Gap**: Not testing builds locally before deployment

### New Approach
1. Find correct Stack Auth handler creation method
2. Test build locally before pushing
3. Verify authentication flow step-by-step
4. Use debug endpoints to validate each stage

---

## Production-Ready Solution

### Correct Implementation Pattern
```typescript
// app/handler/[...stack]/route.ts
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

const handler = StackHandler({
  app: stackServerApp,
});

export { handler as GET, handler as POST };
```

### Authentication Helper
```typescript
// app/(auth)/stack-auth.ts
export async function auth() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) return null;
  
  // Map to local user with company context
  const localUser = await getUserWithCompany(stackUser.id);
  return localUser;
}
```

### Protected Route Pattern
```typescript
// Server Component
export default async function ProtectedPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  // Page content
}
```

---

## Common Pitfalls & High-Risk Areas

### 1. Handler Export Pattern ⚠️
- **Risk**: Wrong export pattern breaks all auth
- **Solution**: Use StackHandler function, not direct export

### 2. Environment Variables 🔴
- **Risk**: Missing vars on Vercel = no auth
- **Solution**: Verify all 3 Stack vars are set

### 3. Cookie Domain Mismatch ⚠️
- **Risk**: Cookies not accessible = redirect loops
- **Solution**: Ensure Stack project URLs match deployment

### 4. Build-Time Errors 🔴
- **Risk**: Type errors prevent deployment
- **Solution**: Always run `pnpm build` locally first

### 5. Multi-Tenant Data Leaks ⚠️
- **Risk**: Missing companyId filter exposes data
- **Solution**: Centralized tenant context enforcement

---

## Implementation Checklist

### Step 1: Fix Handler Implementation
- [ ] Find correct StackHandler import/usage
- [ ] Update handler route file
- [ ] Test build locally
- [ ] Verify no TypeScript errors

### Step 2: Verify Environment Setup
- [ ] Check all Stack env vars in .env.local
- [ ] Verify same vars exist on Vercel
- [ ] Check Stack dashboard URLs match deployment

### Step 3: Test Authentication Flow
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test session persistence
- [ ] Test role-based redirects

### Step 4: Verify Multi-Tenancy
- [ ] Test user-company association
- [ ] Test data isolation between companies
- [ ] Test platform admin cross-company access
- [ ] Test role-based permissions

### Step 5: Production Deployment
- [ ] Run full build test
- [ ] Deploy to Vercel
- [ ] Test authentication on live site
- [ ] Verify no redirect loops

---

## Test Results

### Local Build Test
```bash
Date: 
Command: pnpm build
Result: 
Errors: 
```

### Authentication Flow Test
```
Date: 
Test User: 
Result: 
Issues: 
```

### Multi-Tenant Isolation Test
```
Date: 
Company A User: 
Company B User: 
Result: 
Issues: 
```

### Production Deployment Test
```
Date: 
URL: 
Result: 
Issues: 
```

---

## Current Status: Starting Implementation

Next Step: Find correct StackHandler usage pattern and implement handler route correctly.