'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadSimpleProps {
  companyId: string;
}

export function DocumentUploadSimple({ companyId }: DocumentUploadSimpleProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('benefits');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload-simple', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        toast.success('Document uploaded successfully! Processing started...');
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadStatus('error');
        toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Benefits Documents
        </CardTitle>
        <CardDescription>
          Upload PDF documents to add them to the AI knowledge base. Documents will be processed and made searchable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select PDF Document</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <select
            id="document-type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={uploading}
          >
            <option value="benefits">Benefits Information</option>
            <option value="policy">Policy Document</option>
            <option value="faq">FAQ Document</option>
            <option value="enrollment">Enrollment Guide</option>
            <option value="other">Other</option>
          </select>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Document uploaded successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Upload failed. Please try again.</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Supported format: PDF only</p>
          <p>• Documents will be processed and added to the AI knowledge base</p>
          <p>• Processing may take a few minutes for large documents</p>
        </div>
      </CardContent>
    </Card>
  );
}
