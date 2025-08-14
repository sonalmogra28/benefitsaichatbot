import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import type { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Create handler with proper configuration
const createHandler = () => StackHandler({
  app: stackServerApp,
  // Set to true for authentication endpoints to handle full page renders
  fullPage: true,
});

// Apply rate limiting to auth endpoints
const authRateLimitConfig = {
  max: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ stack: string[] }> },
) {
  const handler = await createHandler();
  const params = await context.params;
  const path = params.stack.join('/');
  
  // Apply rate limiting for sensitive endpoints
  if (path.includes('signin') || path.includes('signup')) {
    return withRateLimit(() => handler(request, context), authRateLimitConfig)(request, context);
  }
  
  return handler(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ stack: string[] }> },
) {
  const handler = await createHandler();
  const params = await context.params;
  const path = params.stack.join('/');
  
  // Apply rate limiting for sensitive endpoints
  if (path.includes('signin') || path.includes('signup') || path.includes('password')) {
    return withRateLimit(() => handler(request, context), authRateLimitConfig)(request, context);
  }
  
  return handler(request, context);
}