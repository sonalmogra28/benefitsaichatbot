// lib/config/env.server.ts

// This configuration is used for the Firebase Admin SDK on the server-side.
// It requires specific environment variables to be set in a `.env.local` file.

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // The private key from the service account JSON, with escaped newlines replaced.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// A check to determine if all necessary parts of the service account are present.
const hasServiceAccount =
  serviceAccount.projectId &&
  serviceAccount.privateKey &&
  serviceAccount.clientEmail;

export const FIREBASE_ADMIN_CONFIG = {
  serviceAccount: hasServiceAccount ? serviceAccount : undefined,
  // The databaseURL is often required for the Admin SDK.
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
};
