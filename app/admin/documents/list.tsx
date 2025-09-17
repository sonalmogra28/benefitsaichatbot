'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

interface Document {
  id: string;
  title?: string;
  name?: string;
  fileName?: string;
  status?: string;
  chunkCount?: number;
  url?: string;
  fileUrl?: string;
  storagePath?: string;
}

export default function AdminDocumentListPage() {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (!loading && !account) {
      router.push('/login');
    } else if (account) {
      // TODO: Check user roles for admin access
      fetchDocuments();
    }
  }, [account, loading, router]);

  const fetchDocuments = async () => {
    try {
      const repositories = await getRepositories();
      const docs = await repositories.documents.list();
      setDocuments(docs);
    } catch (error) {
      logger.error('Error fetching documents', {}, error as Error);
      setDocuments([]);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Delete this document?')) return;
    try {
      const repositories = await getRepositories();
      await repositories.documents.delete(
        doc.id,
        doc.url || doc.fileUrl || doc.storagePath,
      );
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      logger.error('Failed to delete document', { documentId: doc.id }, error as Error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Documents</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.title || doc.name || doc.fileName}</TableCell>
              <TableCell>{doc.status}</TableCell>
              <TableCell>{doc.chunkCount ?? 0}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
