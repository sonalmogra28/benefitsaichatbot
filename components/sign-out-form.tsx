'use client';

import { useUser } from '@stackframe/stack';

export const SignOutForm = () => {
  const user = useUser();

  const handleSignOut = async () => {
    if (user) {
      await user.signOut();
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
