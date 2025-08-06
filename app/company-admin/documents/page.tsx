import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DocumentList } from '@/components/admin/document-list';
import { DocumentUpload } from '@/components/admin/document-upload';

export const dynamic = 'force-dynamic';

async function getCompanyDocuments(companyId: string) {
  const documents = await db
    .select({
      id: knowledgeBaseDocuments.id,
      title: knowledgeBaseDocuments.title,
      documentType: knowledgeBaseDocuments.documentType,
      category: knowledgeBaseDocuments.category,
      fileType: knowledgeBaseDocuments.fileType,
      fileUrl: knowledgeBaseDocuments.fileUrl,
      tags: knowledgeBaseDocuments.tags,
      processedAt: knowledgeBaseDocuments.processedAt,
      createdAt: knowledgeBaseDocuments.createdAt,
      createdBy: knowledgeBaseDocuments.createdBy,
    })
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.companyId, companyId))
    .orderBy(knowledgeBaseDocuments.createdAt);

  return documents.map(doc => ({
    ...doc,
    category: doc.category || undefined,
    fileType: doc.fileType || undefined,
    fileUrl: doc.fileUrl || undefined,
    tags: doc.tags || undefined,
    processedAt: doc.processedAt || undefined,
    status: doc.processedAt ? 'processed' as const : 'pending_processing' as const,
  }));
}

export default async function DocumentsPage() {
  const session = await auth();

  if (
    !session?.user?.companyId ||
    (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin')
  ) {
    redirect('/login');
  }

  const documents = await getCompanyDocuments(session.user.companyId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Document Library</h1>
        <p className="text-muted-foreground">
          Manage benefits documents and resources for your organization
        </p>
      </div>

      <div className="space-y-6">
        <DocumentUpload 
          companyId={session.user.companyId} 
          onUploadComplete={() => window.location.reload()} 
        />
        <DocumentList
          documents={documents}
        />
      </div>
    </div>
  );
}
