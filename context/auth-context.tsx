// context/auth-context.tsx
'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  type User,
  onIdTokenChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const idToken = await user.getIdToken();
        const refreshToken = (user as any).refreshToken as string;
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, refreshToken }),
        });
      } else {
        setUser(null);
        await fetch('/api/auth/session', { method: 'DELETE' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(
      async () => {
        await fetch('/api/auth/refresh', { method: 'POST' });
      },
      10 * 60 * 1000,
    ); // Refresh every 10 minutes
    return () => clearInterval(interval);
  }, [user]);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      toast({
        title: 'Sign-in Failed',
        description: 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isSigningIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
