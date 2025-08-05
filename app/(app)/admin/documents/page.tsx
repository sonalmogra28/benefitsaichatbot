import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DocumentUpload } from '@/components/admin/document-upload';
import { DocumentList } from '@/components/admin/document-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DocumentsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/sign-in');
  }

  // Check if user has admin permissions
  if (session.user.type !== 'platform_admin' && 
      session.user.type !== 'company_admin' && 
      session.user.type !== 'hr_admin') {
    redirect('/dashboard');
  }

  const companyId = session.user.companyId;
  if (!companyId) {
    redirect('/dashboard');
  }

  // Fetch documents for the company
  const documents = await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.companyId, companyId))
    .orderBy(knowledgeBaseDocuments.createdAt);

  // Transform documents for the component
  const transformedDocuments = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    documentType: doc.documentType,
    category: doc.category || undefined,
    tags: (doc.tags as string[]) || [],
    fileUrl: doc.fileUrl || undefined,
    fileType: doc.fileType || undefined,
    processedAt: doc.processedAt || undefined,
    createdAt: doc.createdAt,
    status: doc.processedAt ? 'processed' as const : 'pending_processing' as const,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Knowledge Base Documents</h1>
        <p className="text-muted-foreground mt-2">
          Manage documents that help the AI assistant answer questions about your benefits.
        </p>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload New</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>
                All documents in your company's knowledge base. The AI uses these to answer employee questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList documents={transformedDocuments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <DocumentUpload companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              In your knowledge base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.processedAt).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for AI search
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => !d.processedAt).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Being analyzed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}