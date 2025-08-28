'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { USER_ROLES } from '@/lib/constants/roles';

export function AuthForm({
  setMfaResolver,
  defaultEmail = '',
  isLogin = true,
}: {
  setMfaResolver: (resolver: any) => void;
  defaultEmail?: string;
  isLogin?: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, role } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        
        // Wait a moment for role to be set
        setTimeout(() => {
          // Redirect based on role
          const userRole = role;
          if (userRole === USER_ROLES.SUPER_ADMIN) {
            router.push('/super-admin');
          } else if (userRole === USER_ROLES.PLATFORM_ADMIN) {
            router.push('/admin');
          } else if (userRole === USER_ROLES.COMPANY_ADMIN || userRole === USER_ROLES.HR_ADMIN) {
            router.push('/company-admin');
          } else {
            router.push('/');
          }
        }, 500);
      } else {
        await signUp(email, password);
        router.push('/');
      }
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-required') {
        setMfaResolver(err.resolver);
      } else {
        console.error('Authentication error:', err);
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-4 sm:px-16"
    >
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          className="bg-muted text-md md:text-sm"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      
      <Button type="submit" disabled={loading}>
        {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
      </Button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
