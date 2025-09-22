import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { validateToken } from '@/lib/azure/token-validation';
import { adminAuth } from '@/lib/auth/admin-auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get company ID from user's custom claims
    const companyId = decodedToken.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company assigned' },
        { status: 403 },
      );
    }

    // Fetch documents
    const documentsContainer = await getContainer('documents');
    const query = {
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }]
    };
    
    const { resources: documents } = await documentsContainer.items.query(query).fetchAll();

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get company ID from user's custom claims
    const companyId = decodedToken.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company assigned' },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Create document
    const documentsContainer = await getContainer('documents');
    const document = {
      id: crypto.randomUUID(),
      companyId,
      ...body,
      createdAt: new Date().toISOString(),
      createdBy: decodedToken.uid,
    };

    await documentsContainer.items.create(document);

    return NextResponse.json({ 
      success: true, 
      document: { id: document.id, ...document } 
    });
  } catch (error) {
    logger.error('Error creating document', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}