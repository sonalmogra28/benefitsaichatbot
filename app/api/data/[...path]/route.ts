
import { getContainer } from '@/lib/azure/cosmos-db';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth/admin-auth';
import { logger } from '@/lib/logger';

/**
 * Protected endpoint for updating Firestore documents
 * Requires valid Firebase authentication token
 * @param request - HTTP request with Bearer token
 * @param params - Document path segments
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  try {
    // Extract and validate authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Verify Firebase ID token
    const token = authHeader.split('Bearer ')[1];
    let decodedToken: any;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    // Validate user has appropriate permissions
    const userRole = decodedToken.role || decodedToken.custom_claims?.role || 'employee';
    const companyId = decodedToken.companyId || decodedToken.custom_claims?.companyId;

    // Build and validate document path
    const documentPath = path.join('/');
    
    // Prevent access to sensitive system collections
    const restrictedPaths = ['system', 'config', 'admin_keys'];
    const firstSegment = path[0];
    if (restrictedPaths.includes(firstSegment)) {
      return NextResponse.json(
        { success: false, error: 'Access to this collection is restricted' },
        { status: 403 }
      );
    }

    // Enforce company-level data isolation
    if (firstSegment === 'companies' && path.length > 1) {
      const targetCompanyId = path[1];
      // Users can only modify their own company's data unless super-admin
      if (targetCompanyId !== companyId && userRole !== 'super-admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access to company data' },
          { status: 403 }
        );
      }
    }

    // Parse and validate request data
    const data = await request.json();
    
    // Add audit fields
    const auditedData = {
      ...data,
      lastModifiedBy: decodedToken.uid,
      lastModifiedAt: new Date().toISOString(),
      modifiedByRole: userRole
    };

    // Perform the Cosmos DB update
    const container = await getContainer('documents');
    await container.items.upsert(auditedData);

    // Log the operation for audit purposes
    const auditContainer = await getContainer('audit_logs');
    await auditContainer.items.create({
      action: 'document_update',
      path: documentPath,
      userId: decodedToken.uid,
      userEmail: decodedToken.email,
      userRole: userRole,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error securely without exposing details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorContainer = await getContainer('error_logs');
    await errorContainer.items.create({
      endpoint: '/api/data',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
