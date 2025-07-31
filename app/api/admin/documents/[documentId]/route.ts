import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteDocument } from '@/lib/storage/blob';
import { deleteDocumentVectors } from '@/lib/vectors/pinecone';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin rights
    if (session.user.type !== 'platform_admin' && 
        session.user.type !== 'company_admin' && 
        session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get document details
    const [document] = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, documentId))
      .limit(1);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Verify user belongs to this company (unless platform admin)
    if (session.user.type !== 'platform_admin' && session.user.companyId !== document.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Delete from blob storage
    const { url } = await request.json();
    if (url) {
      await deleteDocument(url);
    }
    
    // Delete vectors from Pinecone
    await deleteDocumentVectors(document.companyId, documentId);
    
    // Delete from database
    await db
      .delete(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, documentId));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}