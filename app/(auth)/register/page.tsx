'use client';

import { SignUp } from '@stackframe/stack';

export default function RegisterPage() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <SignUp />
      </div>
    </div>
  );
}
