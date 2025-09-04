import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { documentService } from '@/lib/firebase/services/document.service';
import { deleteDocument as deleteBlobDocument } from '@/lib/storage/firebase-storage';
import { deleteDocumentVectors } from '@/lib/ai/vector-search';

export const DELETE = withAuth(USER_ROLES.COMPANY_ADMIN, async (
  request: NextRequest,
  { params }: { params: { documentId: string } }
) => {
  try {
    const { documentId } = params;
    const { url } = await request.json();
    
    // 1. Delete from blob storage if URL is provided
    if (url) {
      await deleteBlobDocument(url);
    }
    
    // 2. Delete vectors from the vector database
    // The new documentService does not include companyId, so we pass only the documentId
    await deleteDocumentVectors(documentId);
    
    // 3. Delete the document record from Firestore
    await documentService.deleteDocument(documentId);
    
    return NextResponse.json({ success: true, message: `Document ${documentId} deleted.` });
    
  } catch (error) {
    console.error(`Document deletion error for ${params.documentId}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
});
