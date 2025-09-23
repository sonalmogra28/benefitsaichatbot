// lib/utils/audit.ts

import { azureAuditLoggingService } from '@/lib/services/azure-audit-logging.service';
import { logger } from '@/lib/logger';

export async function logAccess(
  userId: string,
  path: string,
  role: 'user' | 'admin' | 'super-admin',
  companyId?: string,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await azureAuditLoggingService.logUserAccess(
      userId,
      path,
      role,
      companyId,
      ipAddress,
      userAgent,
      success,
      errorMessage
    );
  } catch (error) {
    logger.error('Failed to log access event', { error, userId, path, role });
  }
}

export async function logAuthentication(
  userId: string,
  userEmail: string,
  action: 'login' | 'logout' | 'token_refresh' | 'password_reset',
  success: boolean,
  companyId?: string,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<void> {
  try {
    await azureAuditLoggingService.logAuthentication(
      userId,
      userEmail,
      action,
      success,
      companyId,
      ipAddress,
      userAgent,
      errorMessage
    );
  } catch (error) {
    logger.error('Failed to log authentication event', { error, userId, action });
  }
}

export async function logDataModification(
  userId: string,
  userEmail: string,
  userRole: string,
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  companyId?: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await azureAuditLoggingService.logDataModification(
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      companyId,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage
    );
  } catch (error) {
    logger.error('Failed to log data modification event', { error, userId, action, resourceType });
  }
}

export async function logSystemEvent(
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await azureAuditLoggingService.logSystemEvent(
      action,
      resourceType,
      resourceId,
      details,
      severity,
      success,
      errorMessage
    );
  } catch (error) {
    logger.error('Failed to log system event', { error, action, resourceType });
  }
}
