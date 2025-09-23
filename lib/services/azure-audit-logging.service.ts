import { azureConfig } from '@/lib/azure/config';
import { logger } from '@/lib/logger';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'compliance';
}

export interface LogAnalyticsEvent {
  TimeGenerated: string;
  Computer: string;
  SourceSystem: string;
  AuditEventId: string;
  Action: string;
  ResourceType: string;
  ResourceId: string;
  UserId: string;
  UserEmail: string;
  UserRole: string;
  CompanyId?: string;
  IpAddress?: string;
  UserAgent?: string;
  Success: boolean;
  ErrorMessage?: string;
  Details: string; // JSON string
  Severity: string;
  Category: string;
}

export class AzureAuditLoggingService {
  private applicationInsightsConnectionString: string;
  private logAnalyticsWorkspaceId: string;
  private logAnalyticsSharedKey: string;
  private isInitialized: boolean = false;

  constructor() {
    this.applicationInsightsConnectionString = azureConfig.applicationInsightsConnectionString;
    this.logAnalyticsWorkspaceId = azureConfig.logAnalyticsWorkspaceId;
    this.logAnalyticsSharedKey = azureConfig.logAnalyticsSharedKey;
  }

  /**
   * Initialize the audit logging service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Validate configuration
      if (!this.applicationInsightsConnectionString || !this.logAnalyticsWorkspaceId || !this.logAnalyticsSharedKey) {
        logger.warn('Azure audit logging not fully configured, using fallback logging');
        this.isInitialized = true;
        return;
      }

      this.isInitialized = true;
      logger.info('Azure audit logging service initialized');
    } catch (error) {
      logger.error('Failed to initialize Azure audit logging service', { error });
      this.isInitialized = true; // Allow fallback logging
    }
  }

  /**
   * Log an audit event to Azure services
   */
  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      await this.initialize();

      const auditEvent: AuditEvent = {
        ...event,
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      // Log to Application Insights
      await this.logToApplicationInsights(auditEvent);

      // Log to Log Analytics
      await this.logToLogAnalytics(auditEvent);

      // Log to console as fallback
      logger.auditEvent('Audit event logged', {
        auditId: auditEvent.id,
        action: auditEvent.action,
        resourceType: auditEvent.resourceType,
        userId: auditEvent.userId,
        companyId: auditEvent.companyId,
        success: auditEvent.success,
        severity: auditEvent.severity,
        category: auditEvent.category
      });

    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
    }
  }

  /**
   * Log to Azure Application Insights
   */
  private async logToApplicationInsights(event: AuditEvent): Promise<void> {
    try {
      if (!this.applicationInsightsConnectionString) return;

      // Create custom event for Application Insights
      const customEvent = {
        name: 'AuditEvent',
        time: event.timestamp,
        iKey: this.extractInstrumentationKey(this.applicationInsightsConnectionString),
        data: {
          baseData: {
            name: 'AuditEvent',
            properties: {
              auditId: event.id,
              action: event.action,
              resourceType: event.resourceType,
              resourceId: event.resourceId,
              userId: event.userId,
              userEmail: event.userEmail,
              userRole: event.userRole,
              companyId: event.companyId || '',
              ipAddress: event.ipAddress || '',
              userAgent: event.userAgent || '',
              success: event.success.toString(),
              errorMessage: event.errorMessage || '',
              severity: event.severity,
              category: event.category,
              details: JSON.stringify(event.details)
            }
          }
        }
      };

      // Send to Application Insights using Data Collection API
      await this.sendToApplicationInsights(customEvent);

    } catch (error) {
      logger.error('Failed to log to Application Insights', { error, eventId: event.id });
    }
  }

  /**
   * Log to Azure Log Analytics
   */
  private async logToLogAnalytics(event: AuditEvent): Promise<void> {
    try {
      if (!this.logAnalyticsWorkspaceId || !this.logAnalyticsSharedKey) return;

      const logAnalyticsEvent: LogAnalyticsEvent = {
        TimeGenerated: event.timestamp,
        Computer: process.env.COMPUTERNAME || 'benefits-chatbot',
        SourceSystem: 'BenefitsChatbot',
        AuditEventId: event.id,
        Action: event.action,
        ResourceType: event.resourceType,
        ResourceId: event.resourceId,
        UserId: event.userId,
        UserEmail: event.userEmail,
        UserRole: event.userRole,
        CompanyId: event.companyId,
        IpAddress: event.ipAddress,
        UserAgent: event.userAgent,
        Success: event.success,
        ErrorMessage: event.errorMessage,
        Details: JSON.stringify(event.details),
        Severity: event.severity,
        Category: event.category
      };

      await this.sendToLogAnalytics(logAnalyticsEvent);

    } catch (error) {
      logger.error('Failed to log to Log Analytics', { error, eventId: event.id });
    }
  }

  /**
   * Send data to Application Insights
   */
  private async sendToApplicationInsights(event: any): Promise<void> {
    try {
      const response = await fetch('https://dc.applicationinsights.azure.com/v2/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.extractInstrumentationKey(this.applicationInsightsConnectionString)
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Application Insights API returned ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send to Application Insights', { error });
    }
  }

  /**
   * Send data to Log Analytics
   */
  private async sendToLogAnalytics(event: LogAnalyticsEvent): Promise<void> {
    try {
      const workspaceId = this.logAnalyticsWorkspaceId;
      const sharedKey = this.logAnalyticsSharedKey;
      
      const json = JSON.stringify(event);
      const stringToSign = `POST\n${Buffer.byteLength(json, 'utf8')}\napplication/json\nx-ms-date:${new Date().toUTCString()}\n/api/logs`;
      const signature = this.generateLogAnalyticsSignature(stringToSign, sharedKey);

      const response = await fetch(`https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `SharedKey ${workspaceId}:${signature}`,
          'x-ms-date': new Date().toUTCString(),
          'Log-Type': 'AuditEvents'
        },
        body: json
      });

      if (!response.ok) {
        throw new Error(`Log Analytics API returned ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send to Log Analytics', { error });
    }
  }

  /**
   * Extract instrumentation key from connection string
   */
  private extractInstrumentationKey(connectionString: string): string {
    const match = connectionString.match(/InstrumentationKey=([^;]+)/);
    return match ? match[1] : '';
  }

  /**
   * Generate Log Analytics signature
   */
  private generateLogAnalyticsSignature(stringToSign: string, sharedKey: string): string {
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', Buffer.from(sharedKey, 'base64')).update(stringToSign, 'utf8').digest('base64');
    return signature;
  }

  /**
   * Log user access
   */
  async logUserAccess(
    userId: string,
    path: string,
    role: 'user' | 'admin' | 'super-admin',
    companyId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action: 'access',
      resourceType: 'page',
      resourceId: path,
      userId,
      userEmail: '', // Will be populated by caller if available
      userRole: role,
      companyId,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      details: { path, role },
      severity: 'low',
      category: 'data_access'
    });
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    userId: string,
    userEmail: string,
    action: 'login' | 'logout' | 'token_refresh' | 'password_reset',
    success: boolean,
    companyId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action,
      resourceType: 'authentication',
      resourceId: userId,
      userId,
      userEmail,
      userRole: 'user', // Will be updated by caller if available
      companyId,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      details: { action },
      severity: success ? 'low' : 'high',
      category: 'authentication'
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(
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
    await this.logAuditEvent({
      action,
      resourceType,
      resourceId,
      userId,
      userEmail,
      userRole,
      companyId,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      details,
      severity: success ? 'medium' : 'high',
      category: 'data_modification'
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logAuditEvent({
      action,
      resourceType,
      resourceId,
      userId: 'system',
      userEmail: 'system@benefits-chatbot.com',
      userRole: 'system',
      details,
      severity,
      category: 'system',
      success,
      errorMessage
    });
  }
}

// Export singleton instance
export const azureAuditLoggingService = new AzureAuditLoggingService();
