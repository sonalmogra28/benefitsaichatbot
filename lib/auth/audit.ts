import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

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
 * Log an audit event to Firestore
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Create audit log entry
    const auditEntry = {
      userId: event.userId || null,
      companyId: event.companyId || null,
      action: event.action,
      resource: event.resource || null,
      resourceId: event.resourceId || null,
      details: event.details || {},
      ipAddress: event.ip || null,
      userAgent: event.userAgent || null,
      success: event.success !== false,
      createdAt: FieldValue.serverTimestamp(),
    };
    
    // Log to audit_logs collection
    await adminDb.collection('audit_logs').add(auditEntry);
    
    // Also log to analytics_events for tracking
    await adminDb.collection('analytics_events').add({
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
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the application
  }
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  type: 'login' | 'logout' | 'permission_denied' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled',
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: type,
    resource: 'auth',
    details,
    success: type !== 'permission_denied',
  });
}

/**
 * Log an API access event
 */
export async function logApiAccess(
  endpoint: string,
  method: string,
  userId?: string,
  statusCode?: number,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'api_access',
    resource: endpoint,
    details: {
      method,
      statusCode,
      ...details,
    },
    success: statusCode ? statusCode < 400 : true,
  });
}

/**
 * Log a data access event
 */
export async function logDataAccess(
  collection: string,
  operation: 'read' | 'write' | 'delete',
  documentId?: string,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `data_${operation}`,
    resource: collection,
    resourceId: documentId,
    details,
    success: true,
  });
}

/**
 * Query audit logs
 */
export async function getAuditLogs(
  filters: {
    userId?: string;
    companyId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit = 100
) {
  let query = adminDb.collection('audit_logs').orderBy('createdAt', 'desc');
  
  if (filters.userId) {
    query = query.where('userId', '==', filters.userId);
  }
  
  if (filters.companyId) {
    query = query.where('companyId', '==', filters.companyId);
  }
  
  if (filters.action) {
    query = query.where('action', '==', filters.action);
  }
  
  if (filters.startDate) {
    query = query.where('createdAt', '>=', filters.startDate);
  }
  
  if (filters.endDate) {
    query = query.where('createdAt', '<=', filters.endDate);
  }
  
  const snapshot = await query.limit(limit).get();
  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get recent security events for a user
 */
export async function getUserSecurityEvents(userId: string, limit = 20) {
  const snapshot = await adminDb.collection('audit_logs')
    .where('userId', '==', userId)
    .where('resource', '==', 'auth')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
    
  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Check for suspicious activity
 */
export async function checkSuspiciousActivity(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Check for multiple failed login attempts
  const failedLogins = await adminDb.collection('audit_logs')
    .where('userId', '==', userId)
    .where('action', '==', 'login')
    .where('success', '==', false)
    .where('createdAt', '>=', oneHourAgo)
    .get();
    
  if (failedLogins.size >= 5) {
    return true;
  }
  
  // Check for permission denied events
  const permissionDenied = await adminDb.collection('audit_logs')
    .where('userId', '==', userId)
    .where('action', '==', 'permission_denied')
    .where('createdAt', '>=', oneHourAgo)
    .get();
    
  if (permissionDenied.size >= 10) {
    return true;
  }
  
  return false;
}