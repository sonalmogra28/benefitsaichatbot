// components/with-role.tsx
'use client';

import { useSession } from '@/hooks/use-session';
import { Skeleton } from './ui/skeleton';

type WithRoleProps = {
  children: React.ReactNode;
  allowedRoles: string | string[];
};

export function WithRole({ children, allowedRoles }: WithRoleProps) {
  const { session, isLoading } = useSession();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!session || !roles.includes(session.role)) {
    return null;
  }

  return <>{children}</>;
}
