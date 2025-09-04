'use client';

import { Heading } from '@/components/ui/heading';
import { FileUploader } from '@/components/super-admin/file-uploader';

/**
 * Renders the Document Management page for the Super Admin.
 * This page will allow admins to upload and manage documents for the RAG system.
 */
export default function DocumentManagementPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading
        title="Document Management"
        description="Upload and manage documents to be used by the AI for answering questions."
      />
      <FileUploader />
    </div>
  );
}
