/**
 * Environment-specific configuration
 * This file manages different configurations for development, staging, and production
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: string;
  azureProject: string;
  apiUrl: string;
  appUrl: string;
  features: {
    aiChat: boolean;
    documentUpload: boolean;
    benefitsComparison: boolean;
    analytics: boolean;
    debugging: boolean;
  };
  security: {
    requireHttps: boolean;
    csrfProtection: boolean;
    rateLimiting: boolean;
    sessionTimeout: number; // minutes
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableCloudLogging: boolean;
  };
  monitoring: {
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableUserAnalytics: boolean;
  };
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'Development',
    azureProject:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'benefits-dev',
    apiUrl: 'http://localhost:3000/api',
    appUrl: 'http://localhost:3000',
    features: {
      aiChat: true,
      documentUpload: true,
      benefitsComparison: true,
      analytics: false,
      debugging: true,
    },
    security: {
      requireHttps: false,
      csrfProtection: true,
      rateLimiting: false,
      sessionTimeout: 60 * 24, // 24 hours for dev
    },
    logging: {
      level: 'debug',
      enableConsole: true,
      enableCloudLogging: false,
    },
    monitoring: {
      enableErrorTracking: false,
      enablePerformanceMonitoring: false,
      enableUserAnalytics: false,
    },
  },

  staging: {
    name: 'Staging',
    azureProject:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'benefits-staging',
    apiUrl:
      `${process.env.NEXT_PUBLIC_APP_URL}/api` ||
      'https://staging.benefitsbot.com/api',
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL || 'https://staging.benefitsbot.com',
    features: {
      aiChat: true,
      documentUpload: true,
      benefitsComparison: true,
      analytics: true,
      debugging: true,
    },
    security: {
      requireHttps: true,
      csrfProtection: true,
      rateLimiting: true,
      sessionTimeout: 60 * 4, // 4 hours
    },
    logging: {
      level: 'info',
      enableConsole: true,
      enableCloudLogging: true,
    },
    monitoring: {
      enableErrorTracking: true,
      enablePerformanceMonitoring: true,
      enableUserAnalytics: false, // No real user tracking in staging
    },
  },

  production: {
    name: 'Production',
    azureProject:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'benefits-prod',
    apiUrl:
      `${process.env.NEXT_PUBLIC_APP_URL}/api` || 'https://benefitsbot.com/api',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://benefitsbot.com',
    features: {
      aiChat: true,
      documentUpload: true,
      benefitsComparison: true,
      analytics: true,
      debugging: false,
    },
    security: {
      requireHttps: true,
      csrfProtection: true,
      rateLimiting: true,
      sessionTimeout: 60 * 2, // 2 hours
    },
    logging: {
      level: 'warn',
      enableConsole: false,
      enableCloudLogging: true,
    },
    monitoring: {
      enableErrorTracking: true,
      enablePerformanceMonitoring: true,
      enableUserAnalytics: true,
    },
  },
};

export function getEnvironment(): Environment {
  const env =
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'development';

  if (env === 'staging') return 'staging';
  if (env === 'production') return 'production';
  return 'development';
}

export function getConfig(): EnvironmentConfig {
  return configs[getEnvironment()];
}

export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

// Feature flags
export function isFeatureEnabled(
  feature: keyof EnvironmentConfig['features'],
): boolean {
  return getConfig().features[feature];
}

// Security checks
export function getSecurityConfig() {
  return getConfig().security;
}

// Logging configuration
export function getLoggingConfig() {
  return getConfig().logging;
}
