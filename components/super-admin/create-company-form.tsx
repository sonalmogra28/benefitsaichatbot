'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firestore';

export function CreateCompanyForm() {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name') as string;

    try {
      await addDoc(collection(db, 'companies'), {
        name,
      });
      router.push('/super-admin/companies');
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Create a new company</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Company Name</Label>
          <Input id="name" name="name" type="text" required />
        </div>
        <Button type="submit" className="w-full">
          Create Company
        </Button>
      </form>
    </div>
  );
}
