import { withSentryConfig } from '@sentry/nextjs';
import { FIREBASE_EMULATOR_CONFIG } from './lib/config/env.local.js';

const isDevelopment = process.env.NODE_ENV === 'development';

// Automatically configure environment variables for Firebase Emulators in development
if (isDevelopment) {
  const { projectId, host, ports } = FIREBASE_EMULATOR_CONFIG;
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:${ports.auth}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${host}:${ports.firestore}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${host}:${ports.storage}`;
  console.log('✓ Using Firebase Emulators for local development');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  experimental: {
    turbo: {
      rules: {
        '**/*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  },
);
