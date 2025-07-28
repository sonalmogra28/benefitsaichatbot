// Temporary type patch for AI SDK beta
declare module 'ai' {
  export * from '@ai-sdk/react';
  export * from '@ai-sdk/provider';
  export * from '@ai-sdk/provider-utils';
  
  // Re-export commonly used types and functions
  export type UIMessage = import('@ai-sdk/react').Message;
  export type ChatMessage = import('@ai-sdk/react').Message;
  export type DefaultChatTransport = any;
  
  // Export functions that are missing
  export const generateText: any;
  export const streamText: any;
  export const streamObject: any;
  export const createUIMessageStream: any;
  export const JsonToSseTransformStream: any;
  export const convertToModelMessages: any;
  export const smoothStream: any;
  export const stepCountIs: any;
  export const convertToUIMessages: any;
  export const tool: any;
  export const experimental_generateImage: any;
}