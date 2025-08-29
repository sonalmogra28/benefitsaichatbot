import { FieldValue, Timestamp } from 'firebase/firestore';

// Base interface for chat messages, compatible with AI SDK
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function' | 'tool';
  content: string;
  createdAt: Timestamp | FieldValue;
  // Add any other relevant message metadata like tool calls or function responses
  toolInvocations?: Array<{ toolCallId: string; toolName: string; args: any; result?: any }>;
}

// Conversation Schema
export interface Conversation {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  model: string; // e.g., 'gemini-pro', 'gpt-4'
  visibility: 'private' | 'company' | 'public';
  // Array of messages within the conversation (can be subcollection or embedded for smaller chats)
  messages: ChatMessage[]; 
}

// Optional: If messages are stored in a subcollection, define a separate interface for individual message documents
export interface MessageDocument extends ChatMessage {
  conversationId: string;
}
