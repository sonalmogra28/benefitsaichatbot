// components/auth-form.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onGoogleClick: () => Promise<void>;
  error?: string | null;
  loading: boolean;
}

export function AuthForm({ type, onSubmit, onGoogleClick, error, loading }: AuthFormProps) {
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={type === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (type === 'login' ? 'Signing in...' : 'Creating account...') : (type === 'login' ? 'Sign In' : 'Create Account')}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onGoogleClick} disabled={loading}>
        {loading ? 'Please wait...' : 'Google'}
      </Button>
    </div>
  );
}
