import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { companies, knowledgeBaseDocuments } from '@/lib/db/schema-v2';
import { eq, desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentUploadSection from '@/components/admin/document-upload-section';
import DocumentList from '@/components/admin/document-list';

async function getCompanies() {
  return await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain
    })
    .from(companies)
    .where(sql`${companies.domain} != 'platform'`)
    .then(results => results.filter(c => c.domain !== null) as { id: string; name: string; domain: string }[]);
}

async function getAllDocuments() {
  const results = await db
    .select({
      id: knowledgeBaseDocuments.id,
      title: knowledgeBaseDocuments.title,
      documentType: knowledgeBaseDocuments.documentType,
      category: knowledgeBaseDocuments.category,
      tags: knowledgeBaseDocuments.tags,
      fileUrl: knowledgeBaseDocuments.fileUrl,
      fileType: knowledgeBaseDocuments.fileType,
      processedAt: knowledgeBaseDocuments.processedAt,
      createdAt: knowledgeBaseDocuments.createdAt,
      companyId: knowledgeBaseDocuments.companyId,
      companyName: companies.name,
      companyDomain: companies.domain
    })
    .from(knowledgeBaseDocuments)
    .leftJoin(companies, eq(knowledgeBaseDocuments.companyId, companies.id))
    .orderBy(desc(knowledgeBaseDocuments.createdAt));
    
  // Filter out documents with null fileUrl or fileType
  return results.filter(doc => doc.fileUrl && doc.fileType) as Array<{
    id: string;
    title: string;
    documentType: string;
    category: string | null;
    tags: unknown;
    fileUrl: string;
    fileType: string;
    processedAt: Date | null;
    createdAt: Date;
    companyId: string;
    companyName: string | null;
    companyDomain: string | null;
  }>;
}

export default async function AdminDocumentsPage() {
  const session = await auth();
  
  if (!session?.user || session.user.type !== 'platform_admin') {
    redirect('/login');
  }
  
  const [companiesList, documents] = await Promise.all([
    getCompanies(),
    getAllDocuments()
  ]);
  
  // Group documents by company
  const documentsByCompany = documents.reduce((acc, doc) => {
    const companyId = doc.companyId;
    if (!acc[companyId]) {
      acc[companyId] = {
        companyName: doc.companyName,
        companyDomain: doc.companyDomain,
        documents: []
      };
    }
    acc[companyId].documents.push(doc);
    return acc;
  }, {} as Record<string, { companyName: string | null; companyDomain: string | null; documents: typeof documents }>);
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Document Management</h1>
        <p className="text-muted-foreground">Upload and manage benefits documents for all companies</p>
      </div>
      
      <div className="grid gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>Upload benefits documents for any company</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploadSection companies={companiesList} />
          </CardContent>
        </Card>
        
        {/* Documents by Company */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Documents by Company</h2>
          
          {Object.entries(documentsByCompany).map(([companyId, data]) => (
            <Card key={companyId}>
              <CardHeader>
                <CardTitle className="text-lg">{data.companyName}</CardTitle>
                <CardDescription>{data.companyDomain}.benefitsai.com</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentList documents={data.documents} showCompany={false} />
              </CardContent>
            </Card>
          ))}
          
          {documents.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No documents uploaded yet. Upload the first document above.
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Document Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>Overview of document processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.processedAt).length}
                </p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {documents.filter(d => !d.processedAt).length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}