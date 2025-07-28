'use client';

import { SignIn } from '@stackframe/stack';

export default function LoginPage() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <SignIn />
      </div>
    </div>
  );
}