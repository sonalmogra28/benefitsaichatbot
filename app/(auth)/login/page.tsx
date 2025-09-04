// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = e.currentTarget.email.value;
    const password = e.currentTarget.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onIdTokenChanged listener in the AuthProvider will handle the redirect
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The onIdTokenChanged listener will handle the redirect
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-black">Welcome Back</h1>
        <p className="text-muted-foreground">
          Sign in to access your benefits dashboard.
        </p>
      </div>
      <AuthForm
        type="login"
        onSubmit={handleLogin}
        onGoogleClick={handleGoogleLogin}
        error={error}
        loading={loading}
      />
      <p className="text-center text-sm text-muted-foreground">
        New to Benefits Assistant?{' '}
        <Link href="/register" className="font-bold hover:underline">
          Create Account
        </Link>
      </p>
    </div>
  );
}
