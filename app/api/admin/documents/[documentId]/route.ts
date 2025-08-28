import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { companyService } from '@/lib/firebase/services/company.service';
import { deleteDocument as deleteBlobDocument } from '@/lib/storage/firebase-storage';
import { deleteDocumentVectors } from '@/lib/ai/vector-search';

export const DELETE = withAuth(USER_ROLES.COMPANY_ADMIN, async (
  request: NextRequest,
  { params }: { params: { documentId: string } },
  user
) => {
  try {
    const { documentId } = params;
    
    // TODO: Get companyId from document
    const companyId = user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    // Delete from blob storage
    const { url } = await request.json();
    if (url) {
      await deleteBlobDocument(url);
    }
    
    // Delete vectors from Vertex AI
    await deleteDocumentVectors(companyId, documentId);
    
    // Delete from database
    await companyService.deleteDocument(companyId, documentId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
});
