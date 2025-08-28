'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [embeddings, setEmbeddings] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleUpload = async () => {
    if (file) {
      setIsUploading(true);
      setError(null);

      try {
        // 1. Get a signed URL from our API
        const response = await fetch('/api/super-admin/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const { url } = await response.json();

        // 2. Upload the file to the signed URL
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setProgress(progress);
          }
        };
        xhr.onload = async () => {
          if (xhr.status === 200) {
            setIsUploading(false);
            setIsProcessing(true);
            const gcsUri = `gs://benefitschatbotac-383.appspot.com/documents/${file.name}`;
            const processResponse = await fetch('/api/super-admin/documents/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ gcsUri, contentType: file.type }),
            });
            const data = await processResponse.json();
            setEmbeddings(data.embeddings);
            setIsProcessing(false);
          } else {
            setError('Failed to upload file.');
            setIsUploading(false);
          }
        };
        xhr.onerror = () => {
          setError('Failed to upload file.');
          setIsUploading(false);
        };
        xhr.send(file);
      } catch (error) {
        setError('Failed to get signed URL.');
        setIsUploading(false);
      }
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
        <Button onClick={handleUpload} disabled={!file || isUploading || isProcessing}>
          {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Upload and Process'}
        </Button>
        {isUploading && <Progress value={progress} />}
        {error && <p className="text-red-500">{error}</p>}
        {embeddings && <p>Embeddings generated successfully!</p>}
      </div>
    </div>
  );
}
