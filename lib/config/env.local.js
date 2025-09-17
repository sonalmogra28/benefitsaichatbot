// lib/config/env.local.js

/**
 * This file contains the local environment configuration for Firebase Emulators.
 * It is used by `next.config.mjs` to automatically configure the application
 * for local development. This approach is more reliable than using .env files
 * for emulator settings.
 */
export const FIREBASE_EMULATOR_CONFIG = {
  // The project ID used by the Firebase Emulators.
  projectId: 'benefitschatbotac-383',

  // The host for all emulated services.
  host: '127.0.0.1',

  // Port numbers for the specific emulators, from azure.json.
  ports: {
    auth: 9099,
    firestore: 8080,
    storage: 9199,
  },
};
