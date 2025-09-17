'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/auth-context';

export function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { account } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !account) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // 1. Get SAS URL from our API
      const sasResponse = await fetch('/api/admin/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!sasResponse.ok) throw new Error('Failed to get SAS URL.');
      const { sasUrl, blobName } = await sasResponse.json();

      // 2. Upload file to Azure Blob Storage
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sasUrl, true);
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 100);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 201) {
          setIsUploading(false);
          setIsProcessing(true);
          
          // 3. Notify backend to process the file
          const processResponse = await fetch(
            '/api/super-admin/documents/process',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                blobName,
                fileName: file.name,
                companyId: account.idTokenClaims.extension_companyId,
              }),
            },
          );

          if (!processResponse.ok) throw new Error('Processing failed.');
          setIsProcessing(false);
        } else {
          throw new Error('Upload to Azure failed.');
        }
      };

      xhr.onerror = () => {
        throw new Error('Network error during upload.');
      };

      xhr.send(file);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Upload Documents</h1>
      <div className="space-y-6">
        <div>
          <Label htmlFor="file">Choose a file</Label>
          <Input id="file" type="file" onChange={handleFileChange} />
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || isProcessing}
        >
          {isUploading
            ? `Uploading... ${Math.round(progress)}%`
            : isProcessing
              ? 'Processing...'
              : 'Upload and Process'}
        </Button>
        {isUploading && <Progress value={progress} />}
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
