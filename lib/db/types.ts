import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { 
  users, 
  companies, 
  benefitPlans,
  benefitEnrollments,
  knowledgeBaseDocuments,
  chats,
  messages,
  votes,
  analyticsEvents,
  auditLogs,
  chatAnalytics,
  notificationSettings,
  aiToolUsage
} from './schema';

// Base model types
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type Company = InferSelectModel<typeof companies>;
export type InsertCompany = InferInsertModel<typeof companies>;

export type BenefitPlan = InferSelectModel<typeof benefitPlans>;
export type InsertBenefitPlan = InferInsertModel<typeof benefitPlans>;

export type BenefitEnrollment = InferSelectModel<typeof benefitEnrollments>;
export type InsertBenefitEnrollment = InferInsertModel<typeof benefitEnrollments>;

export type KnowledgeBaseDocument = InferSelectModel<typeof knowledgeBaseDocuments>;
export type InsertKnowledgeBaseDocument = InferInsertModel<typeof knowledgeBaseDocuments>;

export type Chat = InferSelectModel<typeof chats>;
export type InsertChat = InferInsertModel<typeof chats>;

export type Message = InferSelectModel<typeof messages>;
export type InsertMessage = InferInsertModel<typeof messages>;

export type Vote = InferSelectModel<typeof votes>;
export type InsertVote = InferInsertModel<typeof votes>;

export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type InsertAnalyticsEvent = InferInsertModel<typeof analyticsEvents>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type InsertAuditLog = InferInsertModel<typeof auditLogs>;

export type ChatAnalytic = InferSelectModel<typeof chatAnalytics>;
export type InsertChatAnalytic = InferInsertModel<typeof chatAnalytics>;

export type NotificationSetting = InferSelectModel<typeof notificationSettings>;
export type InsertNotificationSetting = InferInsertModel<typeof notificationSettings>;

export type AIToolUsage = InferSelectModel<typeof aiToolUsage>;
export type InsertAIToolUsage = InferInsertModel<typeof aiToolUsage>;

// Stack Auth specific types
export interface StackAuthUser {
  id: string;
  primaryEmail?: string;
  signedUpWithEmail?: string;
  displayName?: string;
  profileImageUrl?: string;
  clientMetadata?: {
    userType?: string;
    companyId?: string;
    department?: string;
    employeeId?: string;
    [key: string]: any;
  };
  serverMetadata?: {
    [key: string]: any;
  };
  hasPassword?: boolean;
  oauthProviders?: string[];
  selectedTeamId?: string | null;
  selectedTeam?: any | null;
}

// User role types
export type UserRole = 'employee' | 'hr_admin' | 'company_admin' | 'platform_admin';

// Extended user type with relations
export interface UserWithCompany extends User {
  company?: Company;
}

// Query result types for common joins
export interface UserWithEnrollments extends User {
  enrollments: BenefitEnrollment[];
}

export interface CompanyWithUsers extends Company {
  users: User[];
  benefitPlans: BenefitPlan[];
}

export interface BenefitPlanWithEnrollments extends BenefitPlan {
  enrollments: BenefitEnrollment[];
}

// API response types
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  type: UserRole;
  companyId?: string;
  stackUserId: string;
  permissions?: string[];
}

export interface SessionUser {
  user: AuthenticatedUser | null;
  expires?: string;
}

// Database operation result types
export interface DbOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}