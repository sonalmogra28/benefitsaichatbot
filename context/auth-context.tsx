// context/auth-context.tsx
'use client';

import { createContext, useEffect, useState, type ReactNode, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { msalInstance, loginRequest } from '@/lib/azure/msal-client';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';

interface AuthContextType {
  account: any | null;
  loading: boolean;
  isSigningIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const [account, setAccount] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    }
  }, [accounts]);

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  const loading = inProgress !== InteractionStatus.None;

  return (
    <AuthContext.Provider
      value={{ account, loading, isSigningIn: loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
