'use client';

import { AuthProvider } from '@/lib/firebase/auth-context';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
