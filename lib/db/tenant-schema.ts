/**
 * Multi-tenant database schema
 * Defines data isolation and tenant management
 */

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  deploymentMode: 'workday' | 'subdomain' | 'standalone';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  configuration: {
    branding: {
      logo: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
    features: {
      sso: boolean;
      analytics: boolean;
      documentUpload: boolean;
      benefitsComparison: boolean;
      adminPortal: boolean;
    };
    workday?: {
      tenantId: string;
      ssoConfig: {
        issuer: string;
        ssoUrl: string;
        certificate?: string;
        jwksUrl?: string;
      };
      embedConfig: {
        containerId: string;
        theme: 'light' | 'dark' | 'auto';
        height: string;
        width: string;
      };
    };
    subdomain?: {
      domain: string;
      ssl: boolean;
      cdn: boolean;
    };
  };
  benefitsData: {
    openEnrollment: {
      year: string;
      startDate: string;
      endDate: string;
      effectiveDate: string;
      specialEffectiveDates?: {
        hsa: string;
        fsa: string;
        commuter: string;
      };
    };
    plans: Array<{
      id: string;
      name: string;
      type: string;
      provider: string;
      coverageYear: {
        start: string;
        end: string;
      };
      premiums: {
        employee: {
          monthly: number;
          biweekly: number;
        };
        employer?: {
          monthly: number;
          biweekly: number;
        };
      };
      coverage: any;
      features: string[];
      exclusions: string[];
    }>;
    eligibility: {
      employeeEligibility: {
        fullTime: {
          hoursRequired: number;
          description: string;
        };
        partTime: {
          hoursRequired: number;
          description: string;
        };
        waitingPeriod: string;
        exclusions: string[];
      };
      dependentEligibility: {
        spouse: {
          included: boolean;
          description: string;
        };
        domesticPartner: {
          included: boolean;
          description: string;
        };
        children: {
          maxAge: number;
          description: string;
          specialCases: string[];
        };
        exclusions: string[];
      };
    };
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  employeeId: string;
  firstName?: string;
  lastName?: string;
  groups: string[];
  role: 'employee' | 'admin' | 'super-admin';
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  preferences: {
    chatModel: string;
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface Conversation {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  visibilityType: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  tags: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  tenantId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any;
  toolResults?: any;
  usage?: any;
  finishReason?: string;
  createdAt: string;
  metadata?: {
    model: string;
    complexity: string;
    routing: string;
  };
}

export interface Document {
  id: string;
  tenantId: string;
  uploadedBy: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'processing' | 'processed' | 'error';
  extractedText?: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    language?: string;
    category?: string;
  };
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  errorMessage?: string;
}

export interface Analytics {
  id: string;
  tenantId: string;
  userId?: string;
  eventType: 'chat_message' | 'plan_comparison' | 'document_upload' | 'enrollment' | 'login' | 'logout';
  eventData: any;
  timestamp: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface TenantUsage {
  tenantId: string;
  period: string; // YYYY-MM format
  totalMessages: number;
  totalUsers: number;
  totalDocuments: number;
  totalApiCalls: number;
  totalTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// Database collection/container names
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  DOCUMENTS: 'documents',
  ANALYTICS: 'analytics',
  USAGE: 'usage',
} as const;

// Partition key strategies for Cosmos DB
export const PARTITION_KEYS = {
  TENANTS: 'id',
  USERS: 'tenantId',
  CONVERSATIONS: 'tenantId',
  MESSAGES: 'tenantId',
  DOCUMENTS: 'tenantId',
  ANALYTICS: 'tenantId',
  USAGE: 'tenantId',
} as const;

// Indexing strategies
export const INDEXES = {
  TENANTS: [
    { path: '/domain', type: 'Hash' },
    { path: '/status', type: 'Hash' },
    { path: '/createdAt', type: 'Range' },
  ],
  USERS: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/email', type: 'Hash' },
    { path: '/employeeId', type: 'Hash' },
    { path: '/role', type: 'Hash' },
    { path: '/status', type: 'Hash' },
    { path: '/lastLoginAt', type: 'Range' },
  ],
  CONVERSATIONS: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/userId', type: 'Hash' },
    { path: '/visibilityType', type: 'Hash' },
    { path: '/createdAt', type: 'Range' },
    { path: '/updatedAt', type: 'Range' },
  ],
  MESSAGES: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/conversationId', type: 'Hash' },
    { path: '/userId', type: 'Hash' },
    { path: '/role', type: 'Hash' },
    { path: '/createdAt', type: 'Range' },
  ],
  DOCUMENTS: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/uploadedBy', type: 'Hash' },
    { path: '/status', type: 'Hash' },
    { path: '/createdAt', type: 'Range' },
    { path: '/mimeType', type: 'Hash' },
  ],
  ANALYTICS: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/eventType', type: 'Hash' },
    { path: '/timestamp', type: 'Range' },
    { path: '/userId', type: 'Hash' },
  ],
  USAGE: [
    { path: '/tenantId', type: 'Hash' },
    { path: '/period', type: 'Hash' },
  ],
} as const;
