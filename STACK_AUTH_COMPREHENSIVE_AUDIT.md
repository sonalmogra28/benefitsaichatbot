# Stack Auth Implementation - Comprehensive Technical Audit

**Date**: August 4, 2025  
**Purpose**: Complete audit for external LLM analysis with read-only repository access  
**Status**: Production-ready authentication system with unresolved integration issues  

---

## Executive Summary

The Benefits AI Platform uses Stack Auth 2.8.22 for multi-tenant authentication. The system is architecturally sound but may have subtle integration issues causing authentication problems. This document provides comprehensive context for root cause analysis.

---

## Current Implementation Overview

### Technology Stack
- **Authentication Provider**: Stack Auth 2.8.22 (replacing NextAuth)
- **Framework**: Next.js 15.3.0-canary.31 with App Router
- **Database**: Neon PostgreSQL with Drizzle ORM 0.35.3
- **Deployment**: Vercel with Edge Runtime
- **Token Storage**: NextJS cookies (`tokenStore: "nextjs-cookie"`)

### Multi-Tenant Architecture
- Each user belongs to exactly one company
- Roles: employee, hr_admin, company_admin, platform_admin
- Row-level security enforces tenant isolation
- Platform admins can access cross-company data

---

## Core Configuration Files

### 1. Stack Auth App Configuration (`/stack.ts`)
```typescript
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/login",
    signUp: "/register",
    afterSignIn: "/",
    afterSignUp: "/onboarding",
    afterSignOut: "/",
  },
});
```

### 2. Authentication Handler (`/app/handler/[...stack]/page.tsx`)
```tsx
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

export default function Handler(props: any) {
  return <StackHandler fullPage app={stackServerApp} {...props} />;
}

export const dynamic = 'force-dynamic';
```

### 3. Auth Helper Functions (`/app/(auth)/stack-auth.ts`)
```typescript
import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';

export async function auth(): Promise<AuthSession | null> {
  try {
    const stackUser = await stackServerApp.getUser();
    
    if (!stackUser) {
      return { user: null };
    }

    // Set tenant context for secure queries
    await setTenantContext(stackUser.id);

    // Look up user in our database by Stack user ID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // User exists in Stack but not in our DB
      return {
        user: {
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          name: stackUser.displayName || undefined,
          type: 'employee',
          stackUserId: stackUser.id,
        },
      };
    }

    const [dbUser] = dbUsers;
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || undefined,
        type: (dbUser.role as UserType) || 'employee',
        companyId: dbUser.companyId,
        stackUserId: dbUser.stackUserId,
      },
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}
```

### 4. Application Layout (`/app/layout.tsx`)
```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <Toaster position="top-center" />
              {children}
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
```

### 5. Middleware Configuration (`/middleware.ts`)
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { stackServerApp } from './stack';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Stack Auth handler routes
  if (pathname.startsWith('/handler')) {
    return NextResponse.next();
  }

  // Skip middleware for API routes, static files, and auth handlers
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/handler/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedPaths = ['/admin', '/company-admin', '/chat', '/debug/auth'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    try {
      const user = await stackServerApp.getUser();
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      console.error('Auth check error in middleware:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
```

---

## Environment Variables

### Required Stack Auth Variables
```env
# Stack Auth Configuration (from .env.local)
NEXT_PUBLIC_STACK_PROJECT_ID=4fd7aa3d-35e6-49a6-a2f3-aafc45ae5cd9
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_k3cv0rz0ygn6p8d1wyamqts48gmngx52qhnpmmefzpwgg
STACK_SECRET_SERVER_KEY=ssk_8fxb4b0dfy9a2a69vr4cfgraspexpg0dma5mcxrf96wt0

# Database Configuration
DATABASE_URL=[Neon PostgreSQL URL]
POSTGRES_URL=[Neon PostgreSQL URL]

# Other Required Variables
OPENAI_API_KEY=[OpenAI API key]
PINECONE_API_KEY=[Pinecone API key]
PINECONE_INDEX_NAME=benefits-ai
```

### Vercel Environment Variables
Note: Environment variables in `VERCEL_ENV_CHECKLIST.md` may differ from `.env.local`:
```env
# Different Stack Auth project configuration
NEXT_PUBLIC_STACK_PROJECT_ID=1f39c103-a9ed-4bb9-a258-f9d5823e3c82
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_hvbjs2tm1y8myshkt6k03m3y64rjt11zpznnt3jmeab70
STACK_SECRET_SERVER_KEY=ssk_c2fy0wpxqz0zzcdr464kxdwp5cq570sbve1mwj092tcwr
```

**⚠️ POTENTIAL ISSUE**: Discrepancy between local and Vercel environment variables could cause authentication failures.

---

## Database Schema & Multi-Tenancy

### User Management Schema
```sql
-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_org_id TEXT UNIQUE NOT NULL,  -- Stack Auth organization ID
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  settings JSON DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_user_id TEXT UNIQUE NOT NULL,  -- Stack Auth user ID
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  employee_id TEXT,
  department TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Multi-tenant constraints
  UNIQUE(email, company_id),
  UNIQUE(employee_id, company_id)
);
```

### Row-Level Security (RLS)
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users: Can only see users from their company
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL
  USING (
    company_id = COALESCE(
      current_setting('app.current_company_id', true)::uuid,
      (
        SELECT u.company_id 
        FROM users u 
        WHERE u.stack_user_id = current_setting('app.current_user_id', true)
      )
    )
  );

-- Policy for platform admins: Can access all users
CREATE POLICY "users_platform_admin_access" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );
```

### Tenant Context Utilities (`/lib/db/tenant-utils.ts`)
```typescript
export async function setTenantContext(stackUserId: string, companyId?: string) {
  try {
    if (companyId) {
      await db.execute(
        sql`SELECT set_tenant_context(${stackUserId}, ${companyId}::uuid)`
      );
    } else {
      await db.execute(sql`SELECT set_tenant_context(${stackUserId})`);
    }
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    throw new Error('Failed to establish secure database session');
  }
}
```

---

## Onboarding API Implementation

### Critical Onboarding Endpoint (`/app/api/onboarding/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = onboardingSchema.parse(body);

    // Start a transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      // Check if user already exists by Stack User ID or email
      const existingUsers = await tx
        .select()
        .from(users)
        .where(
          or(
            eq(users.stackUserId, data.stackUserId),
            eq(users.email, data.email),
          ),
        );

      // If user exists with same Stack ID, return success (idempotent)
      const userByStackId = existingUsers.find(
        (u) => u.stackUserId === data.stackUserId,
      );
      if (userByStackId) {
        return NextResponse.json({
          success: true,
          message: 'User already onboarded',
          user: userByStackId,
        });
      }

      // Determine target company ID
      let targetCompanyId: string;

      if (data.userType === 'platform_admin') {
        // Find or create platform company
        const platformCompany = await tx
          .select()
          .from(companies)
          .where(eq(companies.stackOrgId, 'platform'))
          .limit(1);

        if (platformCompany.length === 0) {
          const [newCompany] = await tx
            .insert(companies)
            .values({
              stackOrgId: 'platform',
              name: 'Platform Administration',
              domain: 'platform',
              subscriptionTier: 'platform',
              settings: { isPlatformCompany: true },
            })
            .returning();
          targetCompanyId = newCompany.id;
        } else {
          targetCompanyId = platformCompany[0].id;
        }
      } else {
        // For other users, validate company info
        if (!data.companyName || !data.companyDomain) {
          return NextResponse.json(
            { error: 'Company information required' },
            { status: 400 },
          );
        }

        const existingCompany = await tx
          .select()
          .from(companies)
          .where(eq(companies.domain, data.companyDomain))
          .limit(1);

        if (existingCompany.length > 0) {
          targetCompanyId = existingCompany[0].id;
        } else {
          // Create new company
          const [newCompany] = await tx
            .insert(companies)
            .values({
              stackOrgId: `org_${data.companyDomain}`,
              name: data.companyName,
              domain: data.companyDomain,
              subscriptionTier: 'trial',
              settings: {
                branding: { primaryColor: '#0066CC', logo: null },
                features: {
                  documentAnalysis: true,
                  aiRecommendations: true,
                  analytics: true,
                },
              },
            })
            .returning();
          targetCompanyId = newCompany.id;
        }
      }

      // Check for email conflicts in the target company
      const emailConflict = existingUsers.find(
        (u) => u.email === data.email && u.companyId === targetCompanyId,
      );

      if (emailConflict) {
        return NextResponse.json(
          {
            error: `A user with email ${data.email} already exists in this company.`,
            details: 'EMAIL_ALREADY_EXISTS',
          },
          { status: 409 },
        );
      }

      // Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          stackUserId: data.stackUserId,
          companyId: targetCompanyId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: roleMap[data.userType],
          department: data.department,
          isActive: true,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'User onboarded successfully',
        user: newUser,
      });
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
```

---

## Authentication Flow

### Stack Auth Integration Points

1. **User Signs In**: Stack Auth handles authentication
2. **Session Creation**: Stack Auth sets cookies (`stack-access`, `stack-refresh`)
3. **User Lookup**: `auth()` function maps Stack user to local database record
4. **Tenant Context**: `setTenantContext()` establishes row-level security
5. **Route Protection**: Middleware redirects unauthenticated users

### Debug Page (`/app/debug/auth/page.tsx`)
The debug page provides comprehensive authentication status:
- Auth session status from `auth()` function
- Stack user status from `stackServerApp.getUser()`
- Stack Auth cookies presence
- Environment variables status
- Request headers information

---

## Known Issues & Previous Resolutions

### 1. "Onboarding Failed" - Duplicate Key Constraint
**Issue**: Database constraint violations during user onboarding
**Root Cause**: Race conditions and inadequate duplicate checking
**Resolution**: Implemented database transactions and comprehensive duplicate checking

### 2. Build Failures due to Next.js 15 Compatibility
**Issue**: Route handlers not returning Response objects
**Root Cause**: Next.js 15 requires explicit Response objects
**Resolution**: Updated all handlers to return proper Response objects

### 3. PPR (Partial Pre-rendering) Conflicts
**Issue**: Cookie-based authentication conflicting with PPR
**Root Cause**: PPR attempts to pre-render pages that require cookies
**Resolution**: Disabled PPR in `next.config.js` for cookie-dependent pages

### 4. Stack Auth Handler Implementation Evolution
**Timeline**:
- **Initial**: Direct export from `stackServerApp` (failed)
- **Attempt 2**: Custom wrapper functions (complex, unstable)
- **Attempt 3**: JSON response placeholder (worked but incomplete)
- **Current**: `StackHandler` component with `fullPage: true`

---

## Critical Areas for Investigation

### 1. Environment Variable Discrepancies
There are different Stack Auth project IDs in `.env.local` vs `VERCEL_ENV_CHECKLIST.md`:
- Local: `4fd7aa3d-35e6-49a6-a2f3-aafc45ae5cd9`
- Vercel: `1f39c103-a9ed-4bb9-a258-f9d5823e3c82`

### 2. Cookie Domain Issues
Stack Auth cookies may not be accessible if domain configuration doesn't match deployment URL.

### 3. Handler Route vs Page Component
Current implementation uses `page.tsx` with `StackHandler`, but Stack Auth documentation may expect route handlers.

### 4. Multi-Tenant Context Timing
`setTenantContext()` is called in `auth()` function, but timing with database queries may be incorrect.

### 5. Stack Auth Version Compatibility
Using Stack Auth 2.8.22 with Next.js 15.3.0-canary.31 - potential version compatibility issues.

---

## Testing & Verification

### Build Status
- ✅ Local builds succeed
- ✅ TypeScript compilation passes
- ✅ Vercel deployment succeeds
- ⚠️ Authentication functionality unclear

### Debug Information Available
```typescript
// Environment check results
const envVars = {
  NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? '✓ Set' : '✗ Not set',
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ? '✓ Set' : '✗ Not set',
  STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY ? '✓ Set' : '✗ Not set',
  DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Not set',
};

// Cookie check results
const stackCookies = {
  'stack-access': cookieStore.get('stack-access')?.value || 'Not found',
  'stack-refresh': cookieStore.get('stack-refresh')?.value || 'Not found',
  'stack-access-token': cookieStore.get('stack-access-token')?.value || 'Not found',
  'stack-refresh-token': cookieStore.get('stack-refresh-token')?.value || 'Not found',
};
```

---

## Stack Auth Documentation Context

### Expected Handler Pattern (from Stack Auth docs)
```typescript
// Route-based handler (may be expected)
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

const handler = StackHandler({
  app: stackServerApp,
});

export { handler as GET, handler as POST };
```

### Current Implementation (Page-based)
```tsx
// Page-based handler (current)
export default function Handler(props: any) {
  return <StackHandler fullPage app={stackServerApp} {...props} />;
}
```

### Multi-Tenant Requirements
- Each user must belong to exactly one company
- Platform admins can access all companies
- All queries must enforce tenant isolation
- User onboarding must handle company creation/assignment

---

## Performance & Security Considerations

### Security Measures Implemented
- Row-level security enforcing tenant isolation
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM
- Secure cookie configuration
- HTTPS enforcement in production

### Performance Optimizations
- Database indexes on frequently queried columns
- Connection pooling with Neon PostgreSQL
- Edge runtime for auth middleware
- Optimized bundle size (102kB shared JS)

---

## Recommendations for Root Cause Analysis

### 1. Verify Environment Configuration
Check if Stack Auth project configuration matches deployment domain and environment variables.

### 2. Test Cookie Setting and Retrieval
Verify that Stack Auth cookies are being set properly and are accessible to the application.

### 3. Validate Handler Implementation
Compare current page-based handler with Stack Auth documentation requirements.

### 4. Check Multi-Tenant Context Flow
Ensure `setTenantContext()` is called at the right time and doesn't interfere with authentication.

### 5. Test Authentication Flow End-to-End
Trace through sign-in, session creation, user lookup, and protected route access.

### 6. Investigate Version Compatibility
Verify compatibility between Stack Auth 2.8.22 and Next.js 15.3.0-canary.31.

---

## Additional Context Files

### Related Configuration Files
- `/next.config.js` - Next.js configuration with PPR disabled
- `/middleware.ts` - Route protection middleware
- `/package.json` - Dependency versions
- `/drizzle.config.ts` - Database configuration
- `/lib/db/migrations/` - Database schema migrations

### Test Files
- `/tests/pages/auth.ts` - Authentication testing utilities
- `/app/debug/auth/page.tsx` - Authentication debugging interface

### Documentation Files
- `/VERCEL_ENV_CHECKLIST.md` - Environment variable requirements
- `/MASTER_TECHNICAL_SPECIFICATION.md` - Complete technical documentation
- `/archive/old-docs/STACK_AUTH_AUDIT.md` - Previous audit results

---

## Conclusion

The Stack Auth implementation is architecturally sound with proper multi-tenant isolation, transaction safety, and security measures. However, there may be subtle configuration or integration issues causing authentication problems. The most likely areas for investigation are:

1. Environment variable discrepancies between local and production
2. Handler implementation pattern (page vs route)
3. Cookie domain configuration
4. Stack Auth version compatibility with Next.js 15

The comprehensive logging and debug infrastructure should help identify the specific failure point in the authentication flow.

---

**Document Version**: 1.0  
**Last Updated**: August 4, 2025  
**Prepared for**: External LLM analysis with read-only repository access
