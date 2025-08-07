import { db } from '@/lib/db';
import { analyticsEvents, auditLogs } from '@/lib/db/schema';
import type { InsertAuditLog } from '@/lib/db/types';

export interface AuditEvent {
  userId?: string;
  companyId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  success?: boolean;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Log to audit_logs table
    const auditEntry: InsertAuditLog = {
      userId: event.userId || null,
      companyId: event.companyId || null,
      action: event.action,
      resource: event.resource || null,
      resourceId: event.resourceId || null,
      details: event.details || {},
      ipAddress: event.ip || null,
      userAgent: event.userAgent || null,
      success: event.success !== false,
    };
    
    await db.insert(auditLogs).values(auditEntry);
    
    // Also log to analytics for tracking
    await db.insert(analyticsEvents).values({
      userId: event.userId || null,
      companyId: event.companyId || null,
      eventType: `audit:${event.action}`,
      eventData: {
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details,
        timestamp: new Date().toISOString(),
      },
      ipAddress: event.ip || null,
      userAgent: event.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the app
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  type: 'login' | 'logout' | 'failed_login' | 'permission_denied' | 'signup',
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: type,
    resource: 'auth',
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    success: type !== 'failed_login' && type !== 'permission_denied',
  });
}

/**
 * Log data access events
 */
export async function logDataAccess(
  userId: string,
  resource: string,
  action: 'read' | 'write' | 'delete',
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `data:${action}`,
    resource,
    resourceId,
    details,
    success: true,
  });
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  userId: string,
  companyId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    companyId: companyId || undefined,
    action: `admin:${action}`,
    resource,
    resourceId,
    details: {
      ...details,
      adminAction: true,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_token' | 'csrf_attempt',
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `security:${type}`,
    resource: 'security',
    details: {
      ...details,
      severity: 'high',
      timestamp: new Date().toISOString(),
    },
    success: false,
  });
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs for a company
 */
export async function getCompanyAuditLogs(
  companyId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('Failed to fetch company audit logs:', error);
    return [];
  }
}

// Import after to avoid circular dependency
import { eq, desc } from 'drizzle-orm';