'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Upload, Search, Download, Trash2, Eye } from 'lucide-react';
import DocumentUploadSection from '@/components/admin/document-upload-section';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  category: string;
}

export default function CompanyDocumentsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (
          !idTokenResult.claims.company_admin &&
          !idTokenResult.claims.hr_admin
        ) {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">
            Manage your company&apos;s benefits documentation
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="mr-2 size-4" />
          Upload Document
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Add benefits documentation for your employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploadSection companies={[]} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Upload your first document to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Name</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-2">Uploaded</div>
                <div className="col-span-1">Actions</div>
              </div>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 gap-4 py-3 border-b items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-5 flex items-center space-x-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                      {doc.category}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {formatFileSize(doc.size)}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Upload className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 GB</div>
            <p className="text-xs text-muted-foreground">Of 10 GB available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Uploads
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
