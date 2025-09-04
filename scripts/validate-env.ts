#!/usr/bin/env node

import { z } from 'zod';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log(
    'Please create a .env.local file with the required environment variables.',
  );
  console.log('You can copy .env.local.example as a starting point.');
  process.exit(1);
}

dotenv.config({ path: envPath });

// Define the environment schema
const envSchema = z.object({
  // Firebase Configuration (Required)
  NEXT_PUBLIC_FIREBASE_API_KEY: z
    .string()
    .min(1, 'Firebase API Key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, 'Firebase Auth Domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z
    .string()
    .min(1, 'Firebase Project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1, 'Firebase Storage Bucket is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1, 'Firebase Messaging Sender ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase App ID is required'),

  // Firebase Admin SDK (Required for server-side)
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(), // Uses NEXT_PUBLIC_FIREBASE_PROJECT_ID if not set
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(), // Only needed if not using ADC
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(), // Only needed if not using ADC

  // AI Provider Keys (At least one required)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // External Services (Required)
  RESEND_API_KEY: z
    .string()
    .min(1, 'Resend API Key is required for email functionality'),

  // Optional Services
  REDIS_URL: z.string().url().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_INDEX: z.string().optional(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),

  // Google Cloud (for Vertex AI)
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(), // Path to service account JSON
});

// Validate environment variables
try {
  const env = envSchema.parse(process.env);

  console.log('✅ Environment variables validation successful!\n');

  // Check Firebase configuration
  console.log('🔥 Firebase Configuration:');
  console.log(`   Project ID: ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`   Auth Domain: ${env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`);

  // Check AI providers
  console.log('\n🤖 AI Providers:');
  const aiProviders = [];
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) aiProviders.push('Google Gemini');
  if (env.OPENAI_API_KEY) aiProviders.push('OpenAI');
  if (env.ANTHROPIC_API_KEY) aiProviders.push('Anthropic Claude');

  if (aiProviders.length === 0) {
    console.warn('   ⚠️  WARNING: No AI provider keys configured!');
    console.warn(
      '   At least one AI provider key is recommended for chat functionality.',
    );
  } else {
    console.log(`   Available: ${aiProviders.join(', ')}`);
  }

  // Check external services
  console.log('\n📧 External Services:');
  console.log(
    `   Email (Resend): ${env.RESEND_API_KEY ? '✓ Configured' : '✗ Missing'}`,
  );
  console.log(
    `   Redis: ${env.REDIS_URL ? '✓ Configured' : '○ Not configured (optional)'}`,
  );
  console.log(
    `   Pinecone: ${env.PINECONE_API_KEY ? '✓ Configured' : '○ Not configured (optional)'}`,
  );

  // Check environment
  console.log('\n🌍 Environment:');
  console.log(`   Mode: ${env.NODE_ENV}`);
  console.log(`   App URL: ${env.NEXT_PUBLIC_APP_URL}`);

  // Firebase Admin SDK check
  console.log('\n🔐 Firebase Admin SDK:');
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.log('   Using service account credentials');
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      `   Using service account file: ${env.GOOGLE_APPLICATION_CREDENTIALS}`,
    );
  } else {
    console.log('   Using Application Default Credentials (ADC)');
    console.log(
      '   Make sure you have run: gcloud auth application-default login',
    );
  }

  // Warnings for production
  if (env.NODE_ENV === 'production') {
    console.log('\n⚠️  Production Environment Checks:');

    if (!env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      console.warn('   - APP_URL should use HTTPS in production');
    }

    if (!env.REDIS_URL) {
      console.warn('   - Redis is recommended for rate limiting in production');
    }

    if (!env.GOOGLE_CLOUD_PROJECT) {
      console.warn(
        '   - Google Cloud Project recommended for Vertex AI in production',
      );
    }
  }

  console.log('\n✨ Environment validation complete!');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed!\n');
    console.error('Missing or invalid environment variables:');

    error.errors.forEach((err) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });

    console.log('\n📝 Required environment variables:');
    console.log('   - All NEXT_PUBLIC_FIREBASE_* variables');
    console.log('   - RESEND_API_KEY (for email functionality)');
    console.log(
      '   - At least one AI provider key (GOOGLE_GENERATIVE_AI_API_KEY recommended)',
    );

    console.log(
      '\n💡 Tip: Copy .env.local.example to .env.local and fill in your values',
    );

    process.exit(1);
  }

  console.error('Unexpected error:', error);
  process.exit(1);
}
