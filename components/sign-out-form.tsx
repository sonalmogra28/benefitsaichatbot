'use client';

// Sign out - to be implemented with Azure AD B2C
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

export const SignOutForm = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
