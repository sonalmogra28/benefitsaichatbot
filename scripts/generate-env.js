#!/usr/bin/env node
import { writeFileSync } from 'fs';

const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'RESEND_API_KEY'
];

const lines = required.map((key) => `${key}=${process.env[key] ?? ''}`);
writeFileSync('.env.production', lines.join('\n'));
console.log('Generated .env.production for build');
