/**
 * Firestore data models for the Benefits Assistant Chatbot
 * All timestamps use Firestore Timestamp type for consistency
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Company entity - represents an organization using the platform
 */
export interface Company {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  status: 'active' | 'inactive' | 'trial' | 'suspended';
  employeeCount: number;
  industry?: string;
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    cancelAtPeriodEnd?: boolean;
  };
  settings: {
    allowedEmailDomains: string[];
    requireEmailVerification: boolean;
    defaultRole: string;
    enableAIChat: boolean;
    enableDocumentUpload: boolean;
    maxDocumentSizeMB: number;
  };
  billing?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    paymentMethod?: string;
  };
  metadata: {
    createdBy: string;
    createdByEmail: string;
    lastModifiedBy?: string;
    lastModifiedByEmail?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * User entity - represents a platform user
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'super-admin' | 'platform-admin' | 'company-admin' | 'hr-admin' | 'employee';
  companyId?: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  hireDate?: Timestamp;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  emailVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Timestamp;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    dependents?: number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
  benefitsEnrollment?: {
    status: 'not-started' | 'in-progress' | 'completed';
    completedAt?: Timestamp;
    selections?: Record<string, any>;
  };
  metadata: {
    lastLoginAt?: Timestamp;
    lastActivityAt?: Timestamp;
    loginCount: number;
    invitedBy?: string;
    invitedAt?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Benefit Plan entity - represents a benefit offering
 */
export interface BenefitPlan {
  id: string;
  companyId: string;
  name: string;
  type: 'health' | 'dental' | 'vision' | '401k' | 'life' | 'disability' | 'fsa' | 'hsa' | 'other';
  provider: string;
  planCode?: string;
  description: string;
  shortDescription?: string;
  coverage: {
    employeeOnly?: number;
    employeeSpouse?: number;
    employeeChildren?: number;
    employeeFamily?: number;
  };
  costs: {
    deductible?: number;
    outOfPocketMax?: number;
    copay?: Record<string, number>;
    coinsurance?: number;
    employerContribution?: number;
  };
  features: string[];
  eligibility: {
    waitingPeriod?: number; // days
    minimumHours?: number; // per week
    employeeTypes?: string[];
  };
  documents: Array<{
    name: string;
    url: string;
    type: 'summary' | 'full' | 'form' | 'other';
    uploadedAt: Timestamp;
  }>;
  enrollment: {
    startDate: Timestamp;
    endDate: Timestamp;
    isOpen: boolean;
  };
  effectiveDate: Timestamp;
  terminationDate?: Timestamp;
  status: 'active' | 'upcoming' | 'expired' | 'draft';
  metadata: {
    createdBy: string;
    lastModifiedBy?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Conversation entity - represents a chat session
 */
export interface Conversation {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  summary?: string;
  status: 'active' | 'archived' | 'deleted';
  visibility: 'private' | 'shared' | 'public';
  tags?: string[];
  metadata: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    totalTokensUsed: number;
    totalCost?: number;
    lastMessageAt: Timestamp;
    messageCount: number;
  };
  sharedWith?: Array<{
    userId: string;
    sharedAt: Timestamp;
    permission: 'view' | 'edit';
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Message entity - represents a single message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: Array<{
    type: 'image' | 'document' | 'link';
    url: string;
    name?: string;
    size?: number;
  }>;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolResponses?: Array<{
    toolCallId: string;
    content: string;
  }>;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    cost?: number;
    temperature?: number;
    edited?: boolean;
    editedAt?: Timestamp;
  };
  feedback?: {
    rating?: 'positive' | 'negative';
    comment?: string;
    ratedAt?: Timestamp;
  };
  createdAt: Timestamp;
}

/**
 * Document entity - represents an uploaded document
 */
export interface Document {
  id: string;
  companyId: string;
  name: string;
  originalName: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  category: 'benefits' | 'policy' | 'form' | 'report' | 'other';
  tags?: string[];
  description?: string;
  uploadedBy: string;
  uploadedByEmail: string;
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    error?: string;
    extractedText?: string;
    metadata?: Record<string, any>;
    embeddings?: number[];
  };
  sharing: {
    isPublic: boolean;
    allowedRoles?: string[];
    allowedUsers?: string[];
  };
  version?: {
    number: number;
    previousVersionId?: string;
  };
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Enrollment entity - represents a benefits enrollment session
 */
export interface Enrollment {
  id: string;
  userId: string;
  companyId: string;
  enrollmentPeriod: {
    year: number;
    type: 'annual' | 'new-hire' | 'qualifying-event';
    startDate: Timestamp;
    endDate: Timestamp;
  };
  status: 'not-started' | 'in-progress' | 'pending-review' | 'completed' | 'cancelled';
  selections: Array<{
    planId: string;
    planType: string;
    coverage: string;
    monthlyPremium: number;
    effectiveDate: Timestamp;
    dependents?: Array<{
      name: string;
      relationship: string;
      dateOfBirth: Timestamp;
    }>;
  }>;
  documents?: Array<{
    type: string;
    url: string;
    uploadedAt: Timestamp;
  }>;
  signature?: {
    signedAt: Timestamp;
    ipAddress: string;
    userAgent: string;
  };
  review?: {
    reviewedBy?: string;
    reviewedAt?: Timestamp;
    status: 'approved' | 'rejected' | 'pending';
    comments?: string;
  };
  metadata: {
    source: 'web' | 'mobile' | 'admin' | 'import';
    sessionDuration?: number;
    completionSteps?: string[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Analytics Event entity - for tracking user interactions
 */
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  companyId?: string;
  sessionId: string;
  eventType: string;
  eventCategory: 'page_view' | 'interaction' | 'conversion' | 'error';
  eventData?: Record<string, any>;
  url?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  timestamp: Timestamp;
}

/**
 * Notification entity - for system notifications
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'enrollment' | 'benefits' | 'document' | 'chat';
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  read: boolean;
  readAt?: Timestamp;
  sent: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Audit Log entity - for compliance and security
 */
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  companyId?: string;
  action: string;
  category: 'auth' | 'data' | 'admin' | 'system';
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  timestamp: Timestamp;
}