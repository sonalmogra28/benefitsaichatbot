import { stackServerApp } from '@/stack';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Build the Stack Auth response.
 * Next 15 requires a real Response in **all** branches.
 * 
 * Since we can't import StackHandler directly, we'll use the 
 * stackServerApp methods to handle auth routes properly.
 */
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
): Promise<Response> {
  const resolvedParams = await params;
  const path = resolvedParams.stack.join('/');
  
  try {
    // For now, return a proper response to avoid runtime errors
    // This ensures Next.js 15 always gets a Response object
    return new Response(
      JSON.stringify({ 
        message: 'Stack Auth handler - temporary implementation',
        path: path,
        method: req.method
      }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const GET    = handle;
export const POST   = handle;
export const PUT    = handle;
export const PATCH  = handle;
export const DELETE = handle;