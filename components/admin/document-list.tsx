'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Document {
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
  companyName?: string | null;
  companyDomain?: string | null;
}

interface DocumentListProps {
  documents: Document[];
  showCompany?: boolean;
}

export default function DocumentList({ documents, showCompany = true }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (documentId: string, documentUrl: string) => {
    setDeletingId(documentId);
    try {
      // Delete from database and blob storage
      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: documentUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Refresh the page to update the list
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    return '📎';
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'policy': return 'bg-blue-100 text-blue-800';
      case 'guide': return 'bg-green-100 text-green-800';
      case 'faq': return 'bg-purple-100 text-purple-800';
      case 'form': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-2xl mt-1">{getFileIcon(doc.fileType)}</span>
            <div className="flex-1">
              <h4 className="font-medium">{doc.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getDocumentTypeBadgeColor(doc.documentType)}>
                  {doc.documentType}
                </Badge>
                {doc.category && (
                  <Badge variant="outline">{doc.category}</Badge>
                )}
                {doc.processedAt ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="size-3" />
                    Processed
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="size-3" />
                    Processing
                  </Badge>
                )}
              </div>
              {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {doc.tags.map((tag: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                {showCompany && doc.companyName && ` • ${doc.companyName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(doc.fileUrl, '_blank')}
              title="View document"
            >
              <ExternalLink className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Download file
                const a = document.createElement('a');
                a.href = doc.fileUrl;
                a.download = doc.title;
                a.click();
              }}
              title="Download document"
            >
              <Download className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === doc.id}
                  title="Delete document"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{doc.title}&quot; and remove it from the knowledge base.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(doc.id, doc.fileUrl)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}