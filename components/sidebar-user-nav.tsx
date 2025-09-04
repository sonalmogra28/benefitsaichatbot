'use client';

import { useSession } from '@/hooks/use-session';
import { SignOutForm } from './sign-out-form';
import { Skeleton } from './ui/skeleton';

export function SidebarUserNav() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1 w-full">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2 p-2 border-t">
      <div className="flex items-center gap-2 w-full p-2">
        <div className="text-sm font-medium truncate">{session.email}</div>
      </div>
      <SignOutForm />
    </div>
  );
}
