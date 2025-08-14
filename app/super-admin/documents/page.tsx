// app/super-admin/documents/page.tsx
import { DocumentList } from '@/components/super-admin/document-list';
import { DocumentUpload } from '@/components/super-admin/document-upload';

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <DocumentUpload />
      </div>
      <DocumentList />
    </div>
  );
}
