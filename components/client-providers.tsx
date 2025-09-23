'use client';

import { MsalProvider } from '@azure/msal-react';
import { getMsalInstance } from '@/lib/azure/msal-client';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { TRPCProvider } from '@/components/trpc-provider';
import { useEffect, useState } from 'react';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [msalInstance, setMsalInstance] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const instance = getMsalInstance();
      setMsalInstance(instance);
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
    }
  }, []);

  // Show loading state during hydration
  if (!isClient || !msalInstance) {
    return (
      <TRPCProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        </ThemeProvider>
      </TRPCProvider>
    );
  }

  return (
    <TRPCProvider>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </MsalProvider>
    </TRPCProvider>
  );
}
