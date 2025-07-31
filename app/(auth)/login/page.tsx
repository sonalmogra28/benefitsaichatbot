'use client';

import { SignIn } from '@stackframe/stack';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <SignIn />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/register" className="text-primary hover:underline">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}