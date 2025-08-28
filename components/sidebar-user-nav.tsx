'use client';

import { useSession } from '@/hooks/use-session';
import { SignOutForm } from './sign-out-form';
import { Skeleton } from './ui/skeleton';

export function SidebarUserNav() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col items-start p-4 border-t">
      <div className="text-sm font-medium">{session.email}</div>
      <div className="text-xs text-muted-foreground">{session.role}</div>
      <div className="mt-2 w-full">
        <SignOutForm />
      </div>
    </div>
  );
}
