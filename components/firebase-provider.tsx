'use client';

import { AuthProvider } from '@/context/auth-context';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
