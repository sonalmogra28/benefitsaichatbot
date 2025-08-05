// File: /app/api/auth/[...stack]/route.ts

import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import type { NextRequest } from 'next/server';

// Create async route handlers that properly handle Stack Auth
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ stack: string[] }> },
) {
  const stackHandler = await StackHandler({
    app: stackServerApp,
    fullPage: false,
  });

  return stackHandler(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ stack: string[] }> },
) {
  const stackHandler = await StackHandler({
    app: stackServerApp,
    fullPage: false,
  });

  return stackHandler(request, context);
}
