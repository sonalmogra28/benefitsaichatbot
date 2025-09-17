// app/(auth)/login/page.tsx
'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const { login, account, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (account) {
      router.push('/');
    }
  }, [account, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <Image
            src="/brand/amerivet-logo.png"
            alt="Amerivet Logo"
            width={160}
            height={48}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in to access your Benefits Assistant.
          </p>
        </div>
        <Button
          onClick={() => login()}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Signing in...' : 'Sign in with Microsoft'}
        </Button>
      </div>
    </div>
  );
}
