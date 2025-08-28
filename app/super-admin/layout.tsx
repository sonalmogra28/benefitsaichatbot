'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (idTokenResult.claims.super_admin) {
          setIsSuperAdmin(true);
        } else {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  if (loading || !isSuperAdmin) {
    return <div>Loading...</div>;
  }

  return <div>{children}</div>;
}
