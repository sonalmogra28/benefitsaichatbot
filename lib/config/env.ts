/**
 * Raw environment variables.
 * Do not import this file directly in your application.
 * Instead, use the `env` object from `@/lib/config`
 */

export type Env = typeof _env;

const _env = {
  // Firebase Public Vars
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  ENABLE_MONITORING: process.env.ENABLE_MONITORING,
};

// We use a proxy to ensure that all environment variables are accessed
// through the `env` object. This is to prevent accidental typos
// and to ensure that all environment variables are documented.
export const env = new Proxy(_env, {
  get(target, prop) {
    if (prop in target) {
      // @ts-expect-error - We know that the property exists
      return target[prop];
    }
    // This should not happen
    throw new Error(`Environment variable ${String(prop)} is not defined`);
  },
});

export const isProduction = () => env.NODE_ENV === 'production';

export const getAppUrl = () => {
  if (isProduction()) {
    return 'https://your-production-app.com'; // Replace with your production URL
  }
  return env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000';
};

export const isFeatureEnabled = (feature: string): boolean => {
  const flag = process.env[`FEATURE_${feature.toUpperCase()}`];
  return flag === 'true';
};

export const isMonitoringEnabled = () => env.ENABLE_MONITORING === 'true';
