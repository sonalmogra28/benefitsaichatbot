export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

// Generate a dummy password for development/testing
export const DUMMY_PASSWORD = 'TempPass123!@#';

// Firebase Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  COMPANIES: 'companies',
  CONVERSATIONS: 'conversations',
  DOCUMENTS: 'documents',
  BENEFITS: 'benefits',
  AUDIT_LOGS: 'audit_logs',
  ANALYTICS: 'analytics_events',
} as const;

// User Roles - Use the ones from lib/constants/roles.ts instead
// This is kept for backward compatibility but should use hyphenated format
export const USER_ROLES = {
  SUPER_ADMIN: 'super-admin',
  PLATFORM_ADMIN: 'platform-admin',
  COMPANY_ADMIN: 'company-admin',
  HR_ADMIN: 'hr-admin',
  EMPLOYEE: 'employee',
} as const;

// Document Types
export const DOCUMENT_TYPES = {
  POLICY: 'policy',
  GUIDE: 'guide',
  FAQ: 'faq',
  FORM: 'form',
  OTHER: 'other',
} as const;

// AI Model Configuration
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gemini-2.0-flash-exp',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  STREAMING: true,
} as const;

// Storage Limits
export const STORAGE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_STORAGE_PER_COMPANY: 10 * 1024 * 1024 * 1024, // 10GB
  ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'],
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 60,
  API_CALLS_PER_HOUR: 1000,
  CHAT_MESSAGES_PER_MINUTE: 20,
  DOCUMENT_UPLOADS_PER_DAY: 100,
} as const;
