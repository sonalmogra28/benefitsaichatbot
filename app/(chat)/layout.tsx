'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    if (!loading && !account) {
      router.push('/login');
    } else if (account) {
      // Check if user has employee role
      if (account.role === 'employee') {
        setIsEmployee(true);
      } else {
        router.push('/');
      }
    }
  }, [account, loading, router]);

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
