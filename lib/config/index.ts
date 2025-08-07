/**
 * Central configuration module
 * Re-exports validated environment variables and configuration helpers
 */

export { env, isFeatureEnabled, getAppUrl, isProduction, isMonitoringEnabled } from './env';
export type { Env } from './env';

// Application-wide configuration constants
export const APP_CONFIG = {
  // Session configuration
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // 24 hours in seconds
    cookieName: 'benefits-session',
  },
  
  // Security configuration
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 12,
    passwordRequirements: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },
  
  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
  },
  
  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },
  
  // Cache configuration
  cache: {
    defaultTTL: 300, // 5 minutes
    maxSize: 100, // Maximum number of items in cache
  },
  
  // Pagination defaults
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;

// Rate limiting configuration (per endpoint)
export const RATE_LIMITS = {
  // Chat endpoints
  '/api/chat': {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  },
  '/api/chat/stream': {
    windowMs: 60 * 1000,
    max: 5, // 5 streaming requests per minute
  },
  
  // Document upload
  '/api/documents/upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
  },
  
  // Authentication
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per hour
  },
  
  // Admin endpoints (more permissive)
  '/api/admin': {
    windowMs: 60 * 1000,
    max: 100, // 100 requests per minute for admin
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 60 * 1000,
    max: 60, // 60 requests per minute
  },
} as const;

// Content Security Policy configuration
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://vercel.live'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://api.stack-auth.com', 'https://api.openai.com', 'wss://', 'https://'],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
} as const;
