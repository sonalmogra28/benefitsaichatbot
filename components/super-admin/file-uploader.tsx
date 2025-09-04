'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { auth, storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      // Basic validation for PDF
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid PDF document.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to upload files.');
      toast({
        title: 'Authentication Error',
        description: 'Please log in again to upload documents.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const storagePath = `documents/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        setError('File upload failed. Please try again.');
        toast({
          title: 'Upload Failed',
          description: `An error occurred while uploading the file: ${error.message}`,
          variant: 'destructive',
        });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const token = await user.getIdToken();

          const response = await fetch('/api/super-admin/documents/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              downloadURL,
              storagePath: uploadTask.snapshot.ref.fullPath,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save document metadata.');
          }

          toast({
            title: 'Upload Successful',
            description: `"${file.name}" has been uploaded and is being processed.`,
          });
        } catch (apiError: any) {
          console.error('Failed to save metadata:', apiError);
          setError(
            `Upload succeeded, but failed to save file details. Please contact support. Error: ${apiError.message}`,
          );
          toast({
            title: 'Metadata Save Failed',
            description:
              'The file was uploaded but could not be registered in the system.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
          setFile(null);
          setUploadProgress(0);
        }
      },
    );
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div
        {...getRootProps()}
        className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <p className="text-lg font-semibold">{file.name}</p>
        ) : isDragActive ? (
          <p>Drop the PDF here...</p>
        ) : (
          <div className="text-center">
            <p className="font-semibold">Drag & drop a PDF file here</p>
            <p className="text-sm text-muted-foreground">
              or click to select a file
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="w-full max-w-xs"
          >
            {isUploading ? `Uploading...` : `Upload ${file.name}`}
          </Button>
          {isUploading && (
            <div className="w-full max-w-xs">
              <Progress value={uploadProgress} />
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {uploadProgress.toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
