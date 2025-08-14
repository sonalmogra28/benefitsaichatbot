'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';

export default function LoginPage() {
  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
  const router = useRouter();

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(email, password);
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <AuthForm action={handleLogin}>
          <SubmitButton>Log in</SubmitButton>
          {error && <p className="text-red-500">{error.message}</p>}
        </AuthForm>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/register" className="text-primary hover:underline">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
