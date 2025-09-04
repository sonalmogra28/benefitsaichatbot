'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
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
import { documentClientService } from '@/lib/firebase/services/document-client.service';

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
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (
          !idTokenResult.claims.platform_admin &&
          !idTokenResult.claims.super_admin &&
          !idTokenResult.claims.company_admin
        ) {
          router.push('/');
        }
      });
      fetchDocuments();
    }
  }, [user, loading, router]);

  const fetchDocuments = async () => {
    const docs = await documentClientService.listDocuments();
    setDocuments(docs);
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentClientService.deleteDocument(
        doc.id,
        doc.url || doc.fileUrl || doc.storagePath,
      );
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      console.error('Failed to delete document:', error);
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
