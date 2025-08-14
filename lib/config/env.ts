import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().describe('PostgreSQL connection URL'),
  POSTGRES_URL: z.string().url().optional(),
  
  // Authentication - Stack Auth
  STACK_PROJECT_ID: z.string().min(1).describe('Stack Auth project ID'),
  STACK_PUBLISHABLE_CLIENT_KEY: z.string().min(1).describe('Stack Auth public key'),
  STACK_SECRET_SERVER_KEY: z.string().min(32).describe('Stack Auth secret key'),
  STACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  
  // Public Stack Auth config
  NEXT_PUBLIC_STACK_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: z.string().min(1),
  NEXT_PUBLIC_STACK_URL: z.string().url().default('https://api.stack-auth.com'),
  
  // AI Configuration
  OPENAI_API_KEY: z.string().startsWith('sk-').describe('OpenAI API key'),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  
  // Vector Database
  PINECONE_API_KEY: z.string().min(1).describe('Pinecone API key'),
  PINECONE_INDEX_NAME: z.string().default('benefits-ai'),
  PINECONE_ENVIRONMENT: z.string().default('us-east-1'),
  
  // Email Service
  RESEND_API_KEY: z.string().startsWith('re_').describe('Resend API key'),
  RESEND_FROM_EMAIL: z.string().email().default('noreply@example.com'),
  FROM_EMAIL: z.string().email().optional(),
  
  // Blob Storage
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  
  // Application Settings
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Benefits Assistant'),
  
  // Feature Flags
  ENABLE_CHAT: z.string().transform(val => val === 'true').default('true'),
  ENABLE_RAG: z.string().transform(val => val === 'true').default('true'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_DOCUMENT_UPLOAD: z.string().transform(val => val === 'true').default('true'),
  
  // Rate Limiting
  CHAT_RATE_LIMIT_PER_MINUTE: z.string().transform(Number).default('10'),
  CHAT_RATE_LIMIT_PER_HOUR: z.string().transform(Number).default('50'),
  
  // Security
  CRON_SECRET: z.string().min(32).describe('Cron job authentication secret'),
  INTERNAL_API_KEY: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Optional monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  DATADOG_API_KEY: z.string().optional(),
  DATADOG_APP_KEY: z.string().optional(),
  
  // Redis (for rate limiting and caching)
  REDIS_URL: z.string().url().optional(),
  
  // Base URL (computed or provided)
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
});

// Type inference for validated environment
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed env object
 * Throws an error if validation fails with detailed error messages
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.message === 'Required')
        .map(err => err.path.join('.'));
      
      const invalidVars = error.errors
        .filter(err => err.message !== 'Required')
        .map(err => `${err.path.join('.')}: ${err.message}`);
      
      console.error('\n🚨 Environment Variable Validation Failed!\n');
      
      if (missingVars.length > 0) {
        console.error('Missing required environment variables:');
        missingVars.forEach(varName => console.error(`  ❌ ${varName}`));
      }
      
      if (invalidVars.length > 0) {
        console.error('\nInvalid environment variables:');
        invalidVars.forEach(msg => console.error(`  ❌ ${msg}`));
      }
      
      console.error('\nPlease check your .env.local file and ensure all required variables are set correctly.\n');
      
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Validate environment on module load
let env: Env;

try {
  env = validateEnv();
} catch (error) {
  // In production, fail fast
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  // In development, throw error to be caught by Next.js
  throw error;
}

// Export validated environment variables
export { env };

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof Pick<Env, 'ENABLE_CHAT' | 'ENABLE_RAG' | 'ENABLE_ANALYTICS' | 'ENABLE_DOCUMENT_UPLOAD'>): boolean {
  return env[feature] === true;
}

// Helper to get public app URL
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// Helper to check if in production
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

// Helper to check if monitoring is configured
export function isMonitoringEnabled(): boolean {
  return !!(env.SENTRY_DSN || env.DATADOG_API_KEY);
}
