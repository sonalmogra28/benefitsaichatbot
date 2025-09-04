import {
  env,
  isProduction,
  getAppUrl,
  isFeatureEnabled,
  isMonitoringEnabled,
  type Env,
} from './env';

/**
 * Application-level configuration.
 * This should be the single source of truth for all environment-based configuration.
 */
export const config = {
  env,
  isProduction: isProduction(),
  appUrl: getAppUrl(),
  isFeatureEnabled,
  monitoring: {
    enabled: isMonitoringEnabled(),
  },
} as const;

export const FIREBASE_CLIENT_CONFIG = {
  apiKey: config.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: config.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: config.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: config.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const RATE_LIMITS = {
  default: {
    max: 100,
    windowMs: 60 * 1000,
  },
};

// Re-export for convenience
export type { Env };
export { env, isProduction, getAppUrl, isFeatureEnabled, isMonitoringEnabled };
