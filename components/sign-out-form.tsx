'use client';

import { useRouter } from 'next/navigation';
import { useStackApp } from '@stackframe/stack';

export const SignOutForm = () => {
  const router = useRouter();
  const app = useStackApp();

  const handleSignOut = async () => {
    await app.signOut();
    router.push('/');
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
