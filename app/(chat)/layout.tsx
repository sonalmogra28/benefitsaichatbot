'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((token) => {
        if (token.claims.role === 'employee') {
          setIsEmployee(true);
        } else {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  if (loading || !isEmployee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {children}
            <div className="absolute bottom-0 w-full">
              <SidebarUserNav />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
