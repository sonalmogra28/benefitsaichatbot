'use client';

import { app } from '@/lib/firebase';
import { AuthProvider } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';

export function FirebaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = getAuth(app);
  return <AuthProvider sdk={auth}>{children}</AuthProvider>;
}
