import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  companyId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export class AuditLoggingService {
  private documentsRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.documentsRepository = repositories.documents;
  }

  /**
   * Log an audit event
   */
  async logEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    companyId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.initializeRepository();
      
      const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        resourceType,
        resourceId,
        userId,
        userEmail,
        userRole,
        companyId,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        success,
        errorMessage
      };

      await this.documentsRepository.create({
        ...auditLog,
        type: 'audit_log'
      });

      logger.info('Audit event logged', {
        auditId: auditLog.id,
        action,
        resourceType,
        resourceId,
        userId,
        companyId
      });
    } catch (error) {
      logger.error('Failed to log audit event', error, {
        action,
        resourceType,
        resourceId,
        userId
      });
    }
  }

  /**
   * Log user login
   */
  async logUserLogin(
    userId: string,
    userEmail: string,
    userRole: string,
    companyId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent(
      'user_login',
      'user',
      userId,
      userId,
      userEmail,
      userRole,
      companyId,
      {},
      ipAddress,
      userAgent,
      success,
      errorMessage
    );
  }

  /**
   * Log user logout
   */
  async logUserLogout(
    userId: string,
    userEmail: string,
    userRole: string,
    companyId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      'user_logout',
      'user',
      userId,
      userId,
      userEmail,
      userRole,
      companyId,
      {},
      ipAddress,
      userAgent
    );
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    companyId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      'data_access',
      resourceType,
      resourceId,
      userId,
      userEmail,
      userRole,
      companyId,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log data modification
   */
  async logDataModification(
    userId: string,
    userEmail: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    companyId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      'data_modification',
      resourceType,
      resourceId,
      userId,
      userEmail,
      userRole,
      companyId,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log data deletion
   */
  async logDataDeletion(
    userId: string,
    userEmail: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    companyId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      'data_deletion',
      resourceType,
      resourceId,
      userId,
      userEmail,
      userRole,
      companyId,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    userId: string,
    userEmail: string,
    userRole: string,
    action: string,
    resourceType: string,
    resourceId: string,
    companyId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent(
      `admin_${action}`,
      resourceType,
      resourceId,
      userId,
      userEmail,
      userRole,
      companyId,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.userId = @userId AND c.type = 'audit_log' ORDER BY c.timestamp DESC`;
      const parameters = [{ name: '@userId', value: userId }];
      
      const { resources } = await this.documentsRepository.query(query, parameters);

      return resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get user audit logs', error, { userId });
      return [];
    }
  }

  /**
   * Get audit logs for a company
   */
  async getCompanyAuditLogs(
    companyId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'audit_log' ORDER BY c.timestamp DESC`;
      const parameters = [{ name: '@companyId', value: companyId }];
      
      const { resources } = await this.documentsRepository.query(query, parameters);

      return resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get company audit logs', error, { companyId });
      return [];
    }
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(
    action: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.action = @action AND c.type = 'audit_log' ORDER BY c.timestamp DESC`;
      const parameters = [{ name: '@action', value: action }];
      
      const { resources } = await this.documentsRepository.query(query, parameters);

      return resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get audit logs by action', error, { action });
      return [];
    }
  }
}

// Export singleton instance
export const auditLoggingService = new AuditLoggingService();
