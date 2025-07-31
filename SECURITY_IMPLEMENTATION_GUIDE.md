# Security Implementation Guide

## Critical Security Gaps & Implementation Plan

This guide addresses the critical security vulnerabilities identified in the Benefits AI Platform and provides concrete implementation steps.

---

## 🚨 Critical Security Issues (Must Fix Immediately)

### 1. Missing Row-Level Security (RLS)

**Current State**: Application-level filtering only  
**Risk**: Database queries could bypass tenant isolation  
**Priority**: CRITICAL  

#### Implementation Steps

```sql
-- Step 1: Create security policies for companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are isolated by tenant"
  ON companies
  FOR ALL
  USING (id = current_setting('app.current_company_id')::uuid);

-- Step 2: Create policies for users table  
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users belong to their company"
  ON users
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Step 3: Create policies for documents
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are company-specific"
  ON knowledge_base_documents
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Step 4: Create policies for all other tables
-- Repeat for: benefit_plans, benefit_enrollments, chats, messages, etc.
```

#### Application Changes

```typescript
// lib/db/index.ts - Update connection to set tenant context
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-v2';

export async function getDbWithTenant(companyId: string) {
  const client = postgres(connectionString, {
    prepare: false,
    connect: async (config) => {
      // Set the tenant context for RLS
      await config.query(`SET app.current_company_id = '${companyId}'`);
    }
  });
  
  return drizzle(client, { schema });
}

// Update all database queries to use tenant-aware connection
export async function withTenantDb<T>(
  companyId: string,
  callback: (db: typeof db) => Promise<T>
): Promise<T> {
  const tenantDb = await getDbWithTenant(companyId);
  try {
    return await callback(tenantDb);
  } finally {
    // Clean up connection
    await tenantDb.$client.end();
  }
}
```

### 2. No API Input Validation

**Current State**: Minimal validation on endpoints  
**Risk**: SQL injection, XSS, data corruption  
**Priority**: HIGH  

#### Implementation with Zod

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// Document upload schema
export const documentUploadSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  documentType: z.enum(['policy', 'guide', 'faq', 'form', 'other']),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Company creation schema
export const createCompanySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  domain: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Domain must be lowercase alphanumeric with hyphens'),
  subscriptionTier: z.enum(['starter', 'professional', 'enterprise']),
  settings: z.object({
    branding: z.object({
      primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
      logo: z.string().url().optional(),
    }),
    features: z.object({
      documentAnalysis: z.boolean(),
      aiRecommendations: z.boolean(),
      advancedAnalytics: z.boolean(),
    }),
  }),
});

// API middleware for validation
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: 'Validation failed',
          details: error.errors 
        };
      }
      return { success: false, error: 'Invalid request body' };
    }
  };
}
```

### 3. Missing Security Headers

**Current State**: No security headers configured  
**Risk**: XSS, clickjacking, MIME sniffing attacks  
**Priority**: HIGH  

#### Next.js Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  }
];

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-insights.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`;

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 4. No Rate Limiting

**Current State**: APIs can be called unlimited times  
**Risk**: DDoS, brute force attacks, resource exhaustion  
**Priority**: HIGH  

#### Implementation with Upstash Redis

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiters for different endpoints
const redis = Redis.fromEnv();

export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
  }),
  
  // Standard API limit
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
    analytics: true,
  }),
  
  // Relaxed limit for chat
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 messages per minute
    analytics: true,
  }),
  
  // Strict limit for file uploads
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 uploads per 10 minutes
    analytics: true,
  }),
};

// Middleware function
export async function rateLimit(
  request: Request,
  limiter: keyof typeof rateLimiters = 'api'
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, limit, reset, remaining } = await rateLimiters[limiter].limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
        'Retry-After': Math.floor((reset - Date.now()) / 1000).toString(),
      },
    });
  }
  
  return null; // Continue processing
}
```

### 5. No Audit Logging

**Current State**: No record of user actions  
**Risk**: Cannot detect or investigate security incidents  
**Priority**: HIGH  

#### Audit Log Implementation

```typescript
// lib/audit/logger.ts
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema-v2';

export type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'document.upload'
  | 'document.delete'
  | 'document.view'
  | 'company.update'
  | 'user.invite'
  | 'user.delete'
  | 'benefits.update'
  | 'chat.message'
  | 'admin.action';

interface AuditContext {
  userId: string;
  companyId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(
  action: AuditAction,
  context: AuditContext,
  details?: Record<string, any>
) {
  try {
    await db.insert(auditLogs).values({
      action,
      userId: context.userId,
      companyId: context.companyId,
      userRole: context.userRole,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: details || {},
      timestamp: new Date(),
    });
  } catch (error) {
    // Log to external service if database fails
    console.error('Audit log failed:', error);
    // Send to monitoring service
  }
}

// Middleware to automatically log API access
export async function auditMiddleware(
  request: Request,
  context: AuditContext,
  action: AuditAction
) {
  const start = Date.now();
  
  // Log the attempt
  await logAudit(action, context, {
    method: request.method,
    path: new URL(request.url).pathname,
    timestamp: new Date().toISOString(),
  });
  
  return {
    logCompletion: async (success: boolean, details?: any) => {
      await logAudit(`${action}.complete` as AuditAction, context, {
        success,
        duration: Date.now() - start,
        ...details,
      });
    },
  };
}
```

---

## 🔐 Additional Security Measures

### 1. Encryption at Rest

```typescript
// lib/encryption/index.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 2. Session Security

```typescript
// lib/auth/session-config.ts
export const sessionConfig = {
  cookieName: 'benefitsai-session',
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  },
  // Implement session rotation
  rotateSession: true,
  rotationInterval: 60 * 60, // 1 hour
};

// Session validation middleware
export async function validateSession(sessionId: string): Promise<boolean> {
  // Check if session exists and is valid
  const session = await redis.get(`session:${sessionId}`);
  if (!session) return false;
  
  // Check for concurrent sessions
  const userSessions = await redis.smembers(`user:${session.userId}:sessions`);
  if (userSessions.length > 3) {
    // Terminate oldest sessions
    await terminateOldestSessions(session.userId, userSessions);
  }
  
  // Update last activity
  await redis.setex(`session:${sessionId}`, sessionConfig.cookieOptions.maxAge, session);
  
  return true;
}
```

### 3. CORS Configuration

```typescript
// lib/cors.ts
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://*.benefitsai.com',
      // Add other allowed origins
    ];
    
    if (!origin || allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'));
        return regex.test(origin);
      }
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
};
```

---

## 🛡️ Security Checklist

### Immediate Actions (Week 1)
- [ ] Implement RLS policies for all tables
- [ ] Add Zod validation to all API endpoints
- [ ] Configure security headers
- [ ] Implement rate limiting
- [ ] Set up audit logging

### Short-term Actions (Weeks 2-3)
- [ ] Encrypt sensitive data at rest
- [ ] Implement session security
- [ ] Configure CORS properly
- [ ] Add CSRF protection
- [ ] Set up monitoring alerts

### Medium-term Actions (Weeks 4-6)
- [ ] Conduct penetration testing
- [ ] Implement WAF rules
- [ ] Add DDoS protection
- [ ] Create incident response plan
- [ ] Security training for team

---

## 📊 Security Monitoring

### Key Metrics to Track
1. **Failed Login Attempts**: Alert on >5 failures
2. **API Rate Limit Hits**: Monitor for abuse
3. **Cross-Tenant Access Attempts**: Critical alerts
4. **File Upload Patterns**: Detect malicious uploads
5. **Session Anomalies**: Multiple locations, unusual patterns

### Alert Configuration
```yaml
alerts:
  - name: High Failed Login Rate
    condition: failed_logins > 10 in 5m
    severity: HIGH
    action: Block IP, notify security team
    
  - name: Cross-Tenant Access Attempt
    condition: tenant_violation_detected
    severity: CRITICAL
    action: Terminate session, audit log, page security
    
  - name: Suspicious File Upload
    condition: file_type_mismatch OR file_size_anomaly
    severity: MEDIUM
    action: Quarantine file, manual review
```

---

This security implementation guide provides concrete steps to address all critical vulnerabilities and establish a robust security posture for the Benefits AI Platform.