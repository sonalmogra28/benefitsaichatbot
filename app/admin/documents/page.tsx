'use client';

import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, storage, db } from '@/lib/firebase';

export default function AdminDocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user] = useAuthState(auth);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Please select a document to upload.');
      return;
    }

    if (!user) {
      setError('You must be logged in to upload documents.');
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'documents'), {
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: storageRef.fullPath,
        fileUrl,
        status: 'pending',
        uploadedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess('Document uploaded successfully.');
      setFile(null);
      const input = document.getElementById('document') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
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
    </div>
  );
}

