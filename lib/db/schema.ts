import type { FieldValue, Timestamp } from 'firebase/firestore';
import type { UserRole } from '../constants/roles';

// Base interfaces for Firestore documents
export interface DocumentBase {
  id: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// User Profile Schema
export interface User extends DocumentBase {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  role: UserRole; // e.g., 'employee', 'company-admin', 'super-admin'
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  lastLoginAt?: Timestamp | FieldValue;
  onboardingCompleted?: boolean;
  onboardingProgress?: number; // e.g., 0-100
  lastOnboardingStep?: string;
  benefitsInterests?: string[]; // e.g., ['health', 'dental', '401k']
  benefitsSelections?: Record<string, any>; // Store selected benefits data
  department?: string;
  hireDate?: Timestamp | FieldValue;
  location?: string;
}

// Benefit Plan Schema
export interface BenefitPlan extends DocumentBase {
  name: string;
  type:
    | 'health'
    | 'dental'
    | 'vision'
    | 'life'
    | 'disability'
    | '401k'
    | 'hsa'
    | 'fsa';
  provider: string;
  description: string;
  annualCost: number; // Base annual cost for employee
  coverageLevels: {
    employee: number;
    employee_spouse?: number;
    employee_children?: number;
    family?: number;
  };
  deductible: number;
  outOfPocketMax: number;
  benefits: string[]; // List of key benefits provided
  isActive: boolean;
  // Add other plan-specific fields
}

// Document Schema (e.g., for uploaded benefits documents)
export interface Document extends DocumentBase {
  userId: string; // Uploader's ID
  title: string;
  fileName: string;
  fileType: string; // e.g., 'application/pdf'
  storagePath: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processing?: {
    startedAt?: Timestamp | FieldValue;
    completedAt?: Timestamp | FieldValue;
    error?: string;
    chunks?: DocumentChunk[]; // For RAG system
  };
  content?: string; // Extracted text content
  vectorId?: string; // ID in vector database
}

// Assuming DocumentChunk and SearchResult are defined elsewhere or need to be created
export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  documentId: string;
  // Add any other relevant chunk metadata
}

export interface SearchResult {
  documentId: string;
  chunkId: string;
  content: string;
  score: number;
}
