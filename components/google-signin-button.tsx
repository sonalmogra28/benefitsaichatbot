'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function GoogleSignInButton() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div>
      <Button onClick={signInWithGoogle}>Sign in with Google</Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
