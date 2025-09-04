'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useUploadFile } from 'react-firebase-hooks/storage';
import { storage, db } from '@/lib/firebase';
import { ref } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';

export function CompanyBrandingForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [uploadFile, uploading, snapshot, error] = useUploadFile();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [primaryColor, setPrimaryColor] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (file) {
        const storageRef = ref(storage, `logos/${companyId}`);
        const uploadResult = await uploadFile(storageRef, file);
        if (uploadResult?.ref) {
          const companyRef = doc(db, 'companies', companyId);
          // Get download URL using getDownloadURL from firebase/storage
          const { getDownloadURL } = await import('firebase/storage');
          const downloadURL = await getDownloadURL(uploadResult.ref);
          await updateDoc(companyRef, {
            logoUrl: downloadURL,
          });
        }
      }

      if (primaryColor) {
        const companyRef = doc(db, 'companies', companyId);
        await updateDoc(companyRef, {
          primaryColor,
        });
      }

      router.push(`/super-admin/companies`);
    } catch (error) {
      console.error('Error updating company branding:', error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Company Branding</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="logo">Company Logo</Label>
          <Input id="logo" type="file" onChange={handleFileChange} />
          {uploading && <Progress value={progress} />}
        </div>
        <div>
          <Label htmlFor="primaryColor">Primary Color</Label>
          <Input
            id="primaryColor"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Save'}
        </Button>
        {error && <p className="text-red-500">{error.message}</p>}
      </form>
    </div>
  );
}
