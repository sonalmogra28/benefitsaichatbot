'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Download, RefreshCw } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
  uploadedBy: string;
  createdAt: any;
  updatedAt: any;
  error?: string;
  chunkCount?: number;
}

export default function AdminDocumentsPage() {
  const { account, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && account) {
      fetchDocuments();
    }
  }, [authLoading, account]);

  const fetchDocuments = async () => {
    try {
      const repositories = await getRepositories();
      const docs = await repositories.documents.list();
      setDocuments(docs);
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching documents', {}, error as Error);
      setDocuments([]);
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Please select a document to upload.');
      return;
    }

    if (!account) {
      setError('You must be logged in to upload documents.');
      return;
    }

    try {
      setUploading(true);
      
      // Upload file to Azure Blob Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', account.companyId || 'default-company');
      formData.append('userId', account.id);
      formData.append('documentType', 'benefits_guide');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess('Document uploaded successfully.');
        setFile(null);
        const input = document.getElementById('document') as HTMLInputElement;
        if (input) input.value = '';
        
        // Refresh documents list
        await fetchDocuments();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      logger.error('Document upload failed', {}, err as Error);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const repositories = await getRepositories();
      await repositories.documents.delete(docId);
      setSuccess('Document deleted successfully.');
      
      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      logger.error('Failed to delete document', {}, err as Error);
      setError('Failed to delete document.');
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      const repositories = await getRepositories();
      const document = await repositories.documents.getById(docId);
      
      if (document) {
        await repositories.documents.update(docId, {
          ...document,
          status: 'pending',
          updatedAt: new Date().toISOString(),
          error: null
        });
        setSuccess('Document queued for reprocessing.');
        
        // Refresh documents list
        await fetchDocuments();
      }
    } catch (err) {
      logger.error('Failed to reprocess document', {}, err as Error);
      setError('Failed to reprocess document.');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      processed: 'default',
      error: 'destructive'
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading title="Document Management" description="Upload documents for processing." />
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <Label htmlFor="document">Document</Label>
          <Input
            id="document"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </form>

      {/* Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button onClick={fetchDocuments} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading documents...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>File:</strong> {doc.fileName}
                    </div>
                    <div>
                      <strong>Size:</strong> {formatFileSize(doc.fileSize)}
                    </div>
                    <div>
                      <strong>Type:</strong> {doc.fileType}
                    </div>
                    <div>
                      <strong>Uploaded:</strong> {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                    {doc.chunkCount && (
                      <div>
                        <strong>Chunks:</strong> {doc.chunkCount}
                      </div>
                    )}
                    {doc.error && (
                      <div className="col-span-2 text-red-500">
                        <strong>Error:</strong> {doc.error}
                      </div>
                    )}
                  </div>
                  {doc.status === 'error' && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprocess(doc.id)}
                      >
                        Reprocess
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

