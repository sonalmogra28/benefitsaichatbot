import dotenv from 'dotenv';
dotenv.config();

// Firebase client configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Firebase admin configuration
export const FIREBASE_ADMIN_CONFIG = {
  serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// AI Provider Keys
export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// External Services
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const REDIS_URL = process.env.REDIS_URL;
export const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

// Environment type
export interface Env {
  FIREBASE_CONFIG: typeof FIREBASE_CONFIG;
  FIREBASE_ADMIN_CONFIG: typeof FIREBASE_ADMIN_CONFIG;
  GOOGLE_GENERATIVE_AI_API_KEY: string | undefined;
  RESEND_API_KEY: string | undefined;
  REDIS_URL: string | undefined;
  PINECONE_API_KEY: string | undefined;
}

// Export aggregated env object
export const env: Env = {
  FIREBASE_CONFIG,
  FIREBASE_ADMIN_CONFIG,
  GOOGLE_GENERATIVE_AI_API_KEY,
  RESEND_API_KEY,
  REDIS_URL,
  PINECONE_API_KEY,
};

// Helper functions
export const isProduction = process.env.NODE_ENV === 'production';

export const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

export const isFeatureEnabled = (feature: string): boolean => {
  const featureFlag = process.env[`FEATURE_${feature.toUpperCase()}`];
  return featureFlag === 'true' || featureFlag === '1';
};

export const isMonitoringEnabled = () => {
  return process.env.ENABLE_MONITORING === 'true';
};

// Validate that all required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
];

if (process.env.NODE_ENV !== 'test') {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.warn(`WARNING: Environment variable ${varName} is not set.`);
    }
  }
}
