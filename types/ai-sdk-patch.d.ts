// Temporary type patch for AI SDK beta
declare module 'ai' {
  export * from '@ai-sdk/react';
  export * from '@ai-sdk/provider';
  export * from '@ai-sdk/provider-utils';

  // Re-export commonly used types and functions
  export type UIMessage = import('@ai-sdk/react').Message;
  export type ChatMessage = import('@ai-sdk/react').Message;
  export const DefaultChatTransport: any;
  export type DataUIPart<T = any> = {
    type: 'data-ui';
    data: T;
  };

  // Additional data part types for artifacts
  export type DataCodeDeltaPart = {
    type: 'data-codeDelta';
    data: string;
  };

  export type DataImageDeltaPart = {
    type: 'data-imageDelta';
    data: any;
  };

  export type DataSheetDeltaPart = {
    type: 'data-sheetDelta';
    data: any;
  };

  export type DataSuggestionPart = {
    type: 'data-suggestion';
    data: any;
  };

  export type CustomUIDataTypes = string | any;

  // Add missing InferUITool type
  export type InferUITool<T> = T extends { execute: (...args: any[]) => any }
    ? T
    : never;

  // Add missing UIMessageStreamWriter type
  export type UIMessageStreamWriter = {
    write: (data: any) => void;
    writeMessage: (message: any) => void;
    writeData: (data: any) => void;
    writeDelta: (delta: any) => void;
    close: () => void;
  };
  export type ModelMessage = any;
  export type ReadStreamResult = any;
  export type DataStreamPart = any;

  // Add missing core message types
  export type CoreAssistantMessage = {
    role: 'assistant';
    content: string;
  };

  export type CoreToolMessage = {
    role: 'tool';
    content: any;
    toolCallId: string;
  };

  export type UIMessagePart = any;

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
  export const generateId: any;
  export const simulateReadableStream: any;
  export const customProvider: any;
  export const extractReasoningMiddleware: any;
  export const wrapLanguageModel: any;
  export const createModelReader: any;
  export const createDataStreamDecoder: any;
  export const experimental_wrapLanguageModel: any;
}
