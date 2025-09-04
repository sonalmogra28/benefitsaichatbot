'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Icons } from '@/components/ui/icons';

export function GoogleSignInButton() {
  const { signInWithGoogle, isSigningIn } = useAuth();

  return (
    <Button 
      variant="outline" 
      onClick={signInWithGoogle} 
      disabled={isSigningIn}
      className="w-full"
    >
      {isSigningIn ? (
        <Icons.spinner className="mr-2 size-4 animate-spin" />
      ) : (
        <Icons.google className="mr-2 size-4" />
      )}
      Sign in with Google
    </Button>
  );
}
