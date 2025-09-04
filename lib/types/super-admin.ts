import type { Company, User } from '@/lib/db/schema';

// Super Admin specific types
export interface SuperAdminProfile {
  id: string;
  email: string;
  name: string;
  role: 'platform-admin';
  permissions: SuperAdminPermission[];
  lastAccess: Date;
  twoFactorEnabled: boolean;
}

export type SuperAdminPermission =
  | 'manage_all_companies'
  | 'manage_all_users'
  | 'view_all_data'
  | 'manage_system_settings'
  | 'view_system_analytics'
  | 'manage_billing'
  | 'access_audit_logs'
  | 'manage_integrations'
  | 'execute_data_migrations'
  | 'manage_feature_flags';

// Company management types
export interface CompanyCreateInput {
  name: string;
  domain?: string;
  maxUsers?: number;
  features: CompanyFeature[];
  billingPlan: BillingPlan;
  adminEmail: string;
}

export interface CompanyUpdateInput {
  name?: string;
  domain?: string;
  maxUsers?: number;
  features?: CompanyFeature[];
  billingPlan?: BillingPlan;
  isActive?: boolean;
}

export interface CompanyWithStats extends Company {
  userCount: number;
  documentCount: number;
  chatCount: number;
  lastActivity?: Date;
  storageUsed: number;
  monthlyActiveUsers: number;
}

export type CompanyFeature =
  | 'chat_enabled'
  | 'document_upload'
  | 'custom_branding'
  | 'advanced_analytics'
  | 'api_access'
  | 'sso_enabled'
  | 'priority_support';

export type BillingPlan = 'free' | 'starter' | 'professional' | 'enterprise';

// User management types
export interface UserWithCompany extends User {
  companyId?: string;
  company?: Company;
  lastActive?: Date;
  chatCount: number;
  documentCount: number;
}

export interface BulkUserCreateInput {
  companyId: string;
  users: {
    email: string;
    name: string;
    type: 'employee' | 'hr-admin' | 'company-admin';
  }[];
  sendInvites: boolean;
}

// System analytics types
export interface SystemAnalytics {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  storage: {
    total: number;
    used: number;
    byCompany: { companyId: string; name: string; used: number }[];
  };
  usage: {
    totalChats: number;
    totalMessages: number;
    totalDocuments: number;
    averageChatsPerUser: number;
    peakHours: { hour: number; count: number }[];
  };
  revenue: {
    mrr: number;
    arr: number;
    byPlan: { plan: BillingPlan; count: number; revenue: number }[];
    churnRate: number;
  };
}

export interface PlatformStats {
  totalUsers: number;
  totalDocuments: number;
  totalBenefitPlans: number;
  storageUsed: number;
}

// Audit log types
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: 'company' | 'user' | 'document' | 'system';
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'company.created'
  | 'company.updated'
  | 'company.deleted'
  | 'company.suspended'
  | 'company.activated'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.suspended'
  | 'user.role_changed'
  | 'data.exported'
  | 'data.imported'
  | 'settings.updated'
  | 'billing.updated'
  | 'email.sent'
  | 'email.failed';

// Data export types
export interface DataExportRequest {
  companyId?: string; // If not provided, export all
  startDate?: Date;
  endDate?: Date;
  includeTypes: DataExportType[];
  format: 'json' | 'csv' | 'excel';
}

export type DataExportType =
  | 'companies'
  | 'users'
  | 'documents'
  | 'chats'
  | 'messages'
  | 'audit_logs';

// System settings types
export interface SystemSettings {
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  defaultBillingPlan: BillingPlan;
  maxCompaniesPerDomain: number;
  emailSettings: {
    provider: 'sendgrid' | 'ses' | 'smtp';
    fromEmail: string;
    fromName: string;
  };
  storageSettings: {
    provider: 's3' | 'gcs' | 'azure';
    maxFileSizeMB: number;
    allowedFileTypes: string[];
  };
  aiSettings: {
    provider: 'openai' | 'anthropic';
    model: string;
    maxTokensPerRequest: number;
    rateLimitPerMinute: number;
  };
  featureFlags: Record<string, boolean>;
}
