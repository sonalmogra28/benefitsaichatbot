// lib/utils/audit.ts

export function logAccess(
  userId: string,
  path: string,
  role: 'user' | 'admin' | 'super-admin',
): void {
  // TODO: Send this log to persistent audit store or external logging service
}
