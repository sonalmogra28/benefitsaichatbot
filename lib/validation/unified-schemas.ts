import { z } from 'zod';

// ============================================================================
// CORE ENTITY SCHEMAS
// ============================================================================

// Base document schema
export const baseDocumentSchema = z.object({
  id: z.string().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]).optional(),
  updatedAt: z.union([z.string().datetime(), z.date()]).optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

// User roles enum
export const userRoleSchema = z.enum([
  'employee',
  'hr-admin', 
  'company-admin',
  'platform-admin',
  'super-admin',
  'owner'
]);

// Company schema
export const companySchema = baseDocumentSchema.extend({
  name: z.string().min(1, 'Company name is required').max(255),
  domain: z.string().email().optional(),
  settings: z.object({
    timezone: z.string().default('UTC'),
    currency: z.string().default('USD'),
    features: z.array(z.string()).default([]),
  }).optional(),
  subscription: z.object({
    plan: z.enum(['free', 'basic', 'premium', 'enterprise']).default('free'),
    status: z.enum(['active', 'suspended', 'cancelled']).default('active'),
    expiresAt: z.string().datetime().optional(),
  }).optional(),
});

// User schema
export const userSchema = baseDocumentSchema.extend({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  displayName: z.string().optional(),
  companyId: z.string().min(1, 'Company ID is required'),
  role: userRoleSchema,
  isActive: z.boolean().default(true),
  lastActive: z.union([z.string().datetime(), z.date()]).optional(),
  profile: z.object({
    department: z.string().optional(),
    position: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
  }).optional(),
  preferences: z.object({
    notifications: z.boolean().default(true),
    language: z.string().default('en'),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  }).optional(),
});

// Benefit plan schema
export const benefitPlanSchema = baseDocumentSchema.extend({
  name: z.string().min(1, 'Plan name is required').max(255),
  type: z.enum([
    'health',
    'dental', 
    'vision',
    'life',
    'disability',
    'retirement',
    '401k',
    'fsa',
    'hsa',
    'other'
  ]),
  category: z.string().optional(),
  provider: z.string().optional(),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Company ID is required'),
  isActive: z.boolean().default(true),
  costs: z.object({
    employeeMonthly: z.number().min(0),
    employerMonthly: z.number().min(0).optional(),
    totalAnnual: z.number().min(0).optional(),
  }),
  coverage: z.object({
    individual: z.number().optional(),
    family: z.number().optional(),
    deductible: z.number().optional(),
    outOfPocketMax: z.number().optional(),
  }).optional(),
  eligibility: z.object({
    waitingPeriod: z.number().default(0), // days
    minimumHours: z.number().default(0), // weekly hours
    employeeTypes: z.array(z.string()).default(['full-time']),
  }).optional(),
  enrollmentPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  features: z.array(z.string()).optional(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    uploadedAt: z.string().datetime(),
  })).optional(),
});

// Document schema
export const documentSchema = baseDocumentSchema.extend({
  title: z.string().min(1, 'Document title is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().min(0, 'File size must be positive'),
  storagePath: z.string().optional(),
  storageUrl: z.string().url().optional(),
  documentType: z.enum(['benefits_guide', 'policy', 'form', 'other']).default('benefits_guide'),
  companyId: z.string().min(1, 'Company ID is required'),
  status: z.enum(['pending', 'processing', 'processed', 'error']).default('pending'),
  uploadedBy: z.string().min(1, 'Uploader ID is required'),
  chunkCount: z.number().optional(),
  ragProcessed: z.boolean().default(false),
  error: z.string().optional(),
});

// Conversation schema
export const conversationSchema = baseDocumentSchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  title: z.string().optional(),
  lastMessage: z.string().optional(),
  messageCount: z.number().default(0),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

// Message schema
export const messageSchema = baseDocumentSchema.extend({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content is required'),
  toolCalls: z.any().optional(),
  toolResults: z.any().optional(),
  usage: z.any().optional(),
  finishReason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z.record(z.any()).optional(),
  pagination: paginationSchema.optional(),
});

// Analytics schema
export const analyticsQuerySchema = z.object({
  metric: z.enum(['overview', 'questions', 'users', 'costs', 'llm-routing']).default('overview'),
  dateRange: dateRangeSchema.optional(),
  companyId: z.string().optional(),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Create user schema
export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Update user schema
export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().min(1, 'User ID is required'),
});

// Create company schema
export const createCompanySchema = companySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Update company schema
export const updateCompanySchema = createCompanySchema.partial().extend({
  id: z.string().min(1, 'Company ID is required'),
});

// Create benefit plan schema
export const createBenefitPlanSchema = benefitPlanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Update benefit plan schema
export const updateBenefitPlanSchema = createBenefitPlanSchema.partial().extend({
  id: z.string().min(1, 'Plan ID is required'),
});

// Chat request schema
export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Message content is required'),
  })).min(1, 'At least one message is required'),
  chatId: z.string().optional(),
  context: z.record(z.any()).optional(),
});

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Invalid email format'),
  role: userRoleSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  search: searchSchema,
  analytics: analyticsQuerySchema,
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Company = z.infer<typeof companySchema>;
export type User = z.infer<typeof userSchema>;
export type BenefitPlan = z.infer<typeof benefitPlanSchema>;
export type Document = z.infer<typeof documentSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateCompany = z.infer<typeof createCompanySchema>;
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type CreateBenefitPlan = z.infer<typeof createBenefitPlanSchema>;
export type UpdateBenefitPlan = z.infer<typeof updateBenefitPlanSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
