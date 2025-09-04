// next.config.mjs
async function setupDevelopmentEnvironment() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    // Use a dynamic import for the JavaScript file
    const { FIREBASE_EMULATOR_CONFIG } = await import(
      './lib/config/env.local.js'
    );
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

  return nextConfig;
}

export default setupDevelopmentEnvironment();
