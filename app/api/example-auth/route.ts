import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth, type AuthSession } from '@/app/(auth)/stack-auth';
import { authenticateFromToken, requireTokenAuth } from '@/lib/auth/token-auth';
import { ChatSDKError } from '@/lib/errors';

/**
 * Example API route that supports both cookie-based and token-based authentication
 * 
 * Cookie-based: Used by your web app (default)
 * Token-based: Used by mobile apps or external services
 */
export async function GET(request: NextRequest) {
  try {
    let session: AuthSession | null;

    // Check if request has Authorization header (Bearer token)
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      // Use token-based authentication for external APIs
      session = await authenticateFromToken(request);
    } else {
      // Use cookie-based authentication for web app
      session = await auth();
    }

    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    // Your API logic here
    const userData = {
      id: session.user.id,
      email: session.user.email,
      type: session.user.type,
      companyId: session.user.companyId,
    };

    return NextResponse.json({ 
      success: true, 
      user: userData,
      authMethod: authHeader ? 'token' : 'cookie'
    });

  } catch (error) {
    console.error('API error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Example POST endpoint that requires specific role
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      // For token auth, use role-based helper
      const user = await requireTokenAuth(request);
      
      // Check if user has admin role
      if (!['company_admin', 'platform_admin'].includes(user.type)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403 }
        );
      }
      
      // Admin-only logic here
      return NextResponse.json({ success: true, message: 'Admin action completed' });
      
    } else {
      // For cookie auth, use existing auth helper
      const session = await auth();
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      if (!['company_admin', 'platform_admin'].includes(session.user.type)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403 }
        );
      }
      
      // Admin-only logic here
      return NextResponse.json({ success: true, message: 'Admin action completed' });
    }
    
  } catch (error) {
    console.error('POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
