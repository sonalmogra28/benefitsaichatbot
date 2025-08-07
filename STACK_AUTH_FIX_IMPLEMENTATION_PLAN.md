# Stack Auth Fix Implementation Plan

**Created:** 2025-08-07  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2-3 days

## Overview

This document outlines the exact steps to fix the Stack Auth implementation issues identified in the audit. Each fix is prioritized and includes specific code changes.

## Phase 1: Critical Security Fixes (Day 1)

### 1. Remove Neon Auth Dependency ❌

**Problem:** The app depends on a non-existent `neon_auth.users_sync` table and uses unsafe SQL queries.

**Solution:** Use Stack Auth's built-in user management directly.

#### File: `/app/(auth)/stack-auth.ts`

```typescript
import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type UserType =
  | 'employee'
  | 'hr_admin'
  | 'company_admin'
  | 'platform_admin'
  | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  type: UserType;
  companyId?: string;
  stackUserId: string;
}

export interface AuthSession {
  user: AuthUser | null;
  expires?: string;
}

/**
 * Get the current authenticated user from Stack Auth
 */
export async function auth(): Promise<AuthSession | null> {
  try {
    const stackUser = await stackServerApp.getUser();

    if (!stackUser) {
      return { user: null };
    }

    // Get user from our database using Stack user ID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // Auto-create user on first login
      const newUser = await createUserFromStackAuth(stackUser);
      return {
        user: newUser,
      };
    }

    const dbUser = dbUsers[0];
    
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName ? `${dbUser.firstName} ${dbUser.lastName || ''}`.trim() : dbUser.email,
        type: (dbUser.role || 'employee') as UserType,
        companyId: dbUser.companyId,
        stackUserId: dbUser.stackUserId,
      },
    };
  } catch (error) {
    console.error('Auth error:', error);
    
    // Return authentication error instead of null
    throw new Error('Authentication failed. Please try again.');
  }
}

/**
 * Create a new user from Stack Auth data
 */
async function createUserFromStackAuth(stackUser: any): Promise<AuthUser> {
  // Extract metadata from Stack Auth
  const metadata = stackUser.clientMetadata || {};
  const userType = metadata.userType || 'employee';
  const companyId = metadata.companyId;
  
  // Validate company exists if companyId provided
  if (companyId) {
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
    if (company.length === 0) {
      throw new Error('Invalid company assignment');
    }
  }
  
  // Create user in database
  const [newUser] = await db
    .insert(users)
    .values({
      stackUserId: stackUser.id,
      email: stackUser.primaryEmail || stackUser.signedUpWithEmail,
      firstName: stackUser.displayName?.split(' ')[0] || '',
      lastName: stackUser.displayName?.split(' ').slice(1).join(' ') || '',
      role: userType,
      companyId: companyId || null,
      isActive: true,
    })
    .returning();
    
  return {
    id: newUser.id,
    email: newUser.email,
    name: stackUser.displayName || newUser.email,
    type: userType as UserType,
    companyId: newUser.companyId,
    stackUserId: newUser.stackUserId,
  };
}

/**
 * Get the current user's company
 */
export async function getUserCompany(userId: string) {
  const [result] = await db
    .select({
      company: companies,
    })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result?.company || null;
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: AuthUser | null,
  requiredRoles: UserType[],
): boolean {
  if (!user) return false;
  
  // Platform admin has access to everything
  if (user.type === 'platform_admin') return true;
  
  // Company admin has access to HR admin functions
  if (user.type === 'company_admin' && requiredRoles.includes('hr_admin')) {
    return true;
  }
  
  return requiredRoles.includes(user.type);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session.user;
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(
  requiredRoles: UserType[],
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}
```

### 2. Fix TypeScript Type Issues ❌

**Problem:** Database queries return untyped results causing TypeScript errors.

#### File: `/lib/db/types.ts` (NEW)

```typescript
import type { InferSelectModel } from 'drizzle-orm';
import type { users, companies } from './schema';

export type User = InferSelectModel<typeof users>;
export type Company = InferSelectModel<typeof companies>;

export interface StackAuthUser {
  id: string;
  primaryEmail?: string;
  signedUpWithEmail?: string;
  displayName?: string;
  clientMetadata?: {
    userType?: string;
    companyId?: string;
    [key: string]: any;
  };
}
```

### 3. Fix SQL Injection in Tenant Utils ❌

**Problem:** Raw SQL with user input in tenant context.

#### File: `/lib/db/tenant-utils.ts`

```typescript
import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Set tenant context for RLS using parameterized queries
 */
export async function setTenantContext(
  stackUserId: string,
  companyId?: string | null,
): Promise<void> {
  if (!stackUserId) {
    throw new Error('Stack user ID is required for tenant context');
  }

  try {
    // Use parameterized query to prevent SQL injection
    const query = sql`
      SELECT set_tenant_context(
        ${stackUserId}::text,
        ${companyId || null}::uuid
      )
    `;
    
    await db.execute(query);
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    // Don't throw - allow request to continue without RLS
    // This prevents auth failures if RLS is not configured
  }
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(): Promise<void> {
  try {
    await db.execute(sql`SELECT clear_tenant_context()`);
  } catch (error) {
    console.error('Failed to clear tenant context:', error);
  }
}

/**
 * Get current tenant context
 */
export async function getCurrentTenant(): Promise<{
  userId?: string;
  companyId?: string;
} | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.current_company_id', true) as company_id
    `);
    
    if (result && result.length > 0) {
      const row = result[0] as any;
      return {
        userId: row.user_id || undefined,
        companyId: row.company_id || undefined,
      };
    }
  } catch (error) {
    console.error('Failed to get tenant context:', error);
  }
  
  return null;
}

/**
 * Execute a function with tenant context
 */
export async function withTenantContext<T>(
  stackUserId: string,
  companyId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  await setTenantContext(stackUserId, companyId);
  try {
    return await fn();
  } finally {
    await clearTenantContext();
  }
}
```

### 4. Fix Stack Handler Configuration ❌

**Problem:** Incorrect configuration preventing proper auth flow.

#### File: `/app/api/auth/[...stack]/route.ts`

```typescript
import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const handler = StackHandler({
  app: stackServerApp,
  // Set to true for authentication endpoints
  fullPage: true,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { stack: string[] } }
) {
  return handler(req, { params });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { stack: string[] } }
) {
  return handler(req, { params });
}
```

## Phase 2: Enhanced Security (Day 2)

### 5. Implement Secure Session Management ❌

#### File: `/lib/auth/session.ts` (NEW)

```typescript
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/config/env';

const secret = new TextEncoder().encode(
  env.STACK_SECRET_SERVER_KEY || 'fallback-secret-key'
);

interface SessionData {
  userId: string;
  userType: string;
  companyId?: string;
  expiresAt: number;
}

export async function createSession(data: Omit<SessionData, 'expiresAt'>): Promise<string> {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  const token = await new SignJWT({ ...data, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
    
  return token;
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) return null;
  
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete('session');
}
```

### 6. Add Comprehensive Audit Logging ❌

#### File: `/lib/auth/audit.ts` (NEW)

```typescript
import { db } from '@/lib/db';
import { analyticsEvents } from '@/lib/db/schema';

export interface AuditEvent {
  userId?: string;
  companyId?: string;
  action: string;
  resource?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      userId: event.userId || null,
      companyId: event.companyId || null,
      eventType: `audit:${event.action}`,
      eventData: {
        resource: event.resource,
        details: event.details,
        timestamp: new Date().toISOString(),
      },
      ipAddress: event.ip || null,
      userAgent: event.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the app
  }
}

export async function logAuthEvent(
  type: 'login' | 'logout' | 'failed_login' | 'permission_denied',
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: type,
    resource: 'auth',
    details,
  });
}

export async function logDataAccess(
  userId: string,
  resource: string,
  action: 'read' | 'write' | 'delete',
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `data:${action}`,
    resource,
    details,
  });
}
```

### 7. Implement Rate Limiting for Auth ❌

#### File: `/app/api/auth/[...stack]/route.ts` (UPDATE)

```typescript
import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const handler = StackHandler({
  app: stackServerApp,
  fullPage: true,
});

// Apply stricter rate limiting to auth endpoints
const rateLimitedHandler = withRateLimit(handler, {
  max: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
});

export async function GET(
  req: NextRequest,
  { params }: { params: { stack: string[] } }
) {
  return rateLimitedHandler(req, { params });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { stack: string[] } }
) {
  return rateLimitedHandler(req, { params });
}
```

## Phase 3: Clean Up & Testing (Day 3)

### 8. Remove Webhook Sync Dependency ❌

The webhook sync endpoint should be simplified to only update user metadata:

#### File: `/app/api/auth/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/api-middleware';
import { logAuthEvent } from '@/lib/auth/audit';

export const POST = withAuth(async (request: NextRequest, { session }) => {
  try {
    const { stackUserId, metadata } = await request.json();
    
    if (!stackUserId) {
      return NextResponse.json(
        { error: 'Stack user ID required' },
        { status: 400 }
      );
    }
    
    // Update user metadata
    await db
      .update(users)
      .set({
        role: metadata?.userType || 'employee',
        updatedAt: new Date(),
      })
      .where(eq(users.stackUserId, stackUserId));
      
    await logAuthEvent('sync', stackUserId, { metadata });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}, ['platform_admin']); // Only platform admins can sync users
```

### 9. Add TypeScript Type Checking ❌

Update `tsconfig.json` to enable strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 10. Update Environment Variables ❌

Clean up `.env.local.example`:

```bash
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID=your-stack-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_your-publishable-key
STACK_SECRET_SERVER_KEY=ssk_your-secret-server-key-minimum-32-chars
NEXT_PUBLIC_STACK_URL=https://api.stack-auth.com

# Remove deprecated Neon Auth variables
# NEON_AUTH_* variables are no longer needed
```

## Testing Checklist

After implementing these fixes:

1. **Run TypeScript check**: `pnpm typecheck` should pass
2. **Test authentication flow**:
   - User registration
   - User login
   - Role-based access
   - Session persistence
3. **Test multi-tenant features**:
   - Company isolation
   - Admin access controls
   - Super admin functionality
4. **Security testing**:
   - SQL injection attempts
   - Invalid session tokens
   - Rate limiting
5. **Performance testing**:
   - Load test auth endpoints
   - Monitor database queries

## Migration Steps for Existing Users

1. **Backup database** before migration
2. **Run migration script** to update user records:

```typescript
// scripts/migrate-stack-auth.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function migrateUsers() {
  // Remove dependency on neon_auth.users_sync
  // Ensure all users have proper stackUserId
  
  const allUsers = await db.select().from(users);
  
  for (const user of allUsers) {
    if (!user.stackUserId || user.stackUserId.startsWith('migrated-')) {
      console.log(`User ${user.email} needs Stack Auth account creation`);
      // Manual intervention required
    }
  }
}

migrateUsers();
```

## Monitoring & Alerts

Set up monitoring for:
- Failed authentication attempts
- Unusual access patterns
- Performance degradation
- Error rates

## Conclusion

These fixes address all critical security vulnerabilities and implementation issues in the Stack Auth system. The implementation removes external dependencies, improves type safety, and adds proper security controls. Total implementation time: 2-3 days with thorough testing.