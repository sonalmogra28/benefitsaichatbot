'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarUserNav } from '@/components/sidebar-user-nav';

export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
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
