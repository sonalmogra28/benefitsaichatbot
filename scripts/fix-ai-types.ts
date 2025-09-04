#!/usr/bin/env tsx

/**
 * Temporary fix for AI SDK TypeScript resolution issues
 * This script creates a type declaration patch for the AI SDK beta
 */

import fs from 'node:fs';
import path from 'node:path';

const typePatchContent = `
// Temporary type patch for AI SDK beta
declare module 'ai' {
  export * from '@ai-sdk/react';
  export * from '@ai-sdk/provider';
  
  // Re-export commonly used types that are missing
  export type UIMessage = import('@ai-sdk/react').Message;
  export const generateText: typeof import('@ai-sdk/provider').generateText;
  export const streamText: typeof import('@ai-sdk/provider').streamText;
  export const createUIMessageStream: typeof import('@ai-sdk/react').createUIMessageStream;
  export const JsonToSseTransformStream: typeof import('@ai-sdk/react').JsonToSseTransformStream;
}
`;

const typeDir = path.join(process.cwd(), 'types');
const patchFile = path.join(typeDir, 'ai-sdk-patch.d.ts');

// Create types directory if it doesn't exist
if (!fs.existsSync(typeDir)) {
  fs.mkdirSync(typeDir, { recursive: true });
}

// Write the patch file
fs.writeFileSync(patchFile, typePatchContent.trim());

console.log('✅ Created AI SDK type patch at:', patchFile);
console.log(
  'ℹ️  This is a temporary fix. Consider downgrading to a stable AI SDK version for production.',
);
