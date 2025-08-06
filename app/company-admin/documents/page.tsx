import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DocumentList } from '@/components/admin/document-list';

export const dynamic = 'force-dynamic';

async function getCompanyDocuments(companyId: string) {
  const documents = await db
    .select({
      id: knowledgeBaseDocuments.id,
      title: knowledgeBaseDocuments.title,
      category: knowledgeBaseDocuments.category,
      fileType: knowledgeBaseDocuments.fileType,
      fileSize: knowledgeBaseDocuments.fileSize,
      fileUrl: knowledgeBaseDocuments.fileUrl,
      tags: knowledgeBaseDocuments.tags,
      processedAt: knowledgeBaseDocuments.processedAt,
      createdAt: knowledgeBaseDocuments.createdAt,
      createdBy: knowledgeBaseDocuments.createdBy,
    })
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.companyId, companyId))
    .orderBy(knowledgeBaseDocuments.createdAt);
    
  return documents;
}

export default async function DocumentsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId || 
      (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin')) {
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
      
      <DocumentList 
        documents={documents} 
        companyId={session.user.companyId}
        isCompanyAdmin={true}
      />
    </div>
  );
}
