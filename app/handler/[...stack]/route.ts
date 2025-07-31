import { stackServerApp } from '@/stack';

export const runtime = 'edge';

// Stack Auth requires a handler function that processes all auth routes
// This is the official pattern for Next.js App Router integration
export const { GET, POST } = stackServerApp.handler;