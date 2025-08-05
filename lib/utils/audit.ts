// lib/utils/audit.ts

export function logAccess(
  userId: string,
  path: string,
  role: 'user' | 'admin' | 'super-admin',
): void {
  // Audit log entry for data access
  console.log(
    `[Audit] userId=${userId} role=${role} path=${path} timestamp=${new Date().toISOString()}`,
  );
  // TODO: Send this log to persistent audit store or external logging service
}
