// import type { Date, Timestamp } from 'azure/firestore';
type Timestamp = Date;
import type { UserRole } from '../constants/roles';

// Base interfaces for Firestore documents
export interface DocumentBase {
  id: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Company extends DocumentBase {
  name: string;
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
  lastLoginAt?: Timestamp | Date;
  onboardingCompleted?: boolean;
  onboardingProgress?: number; // e.g., 0-100
  lastOnboardingStep?: string;
  benefitsInterests?: string[]; // e.g., ['health', 'dental', '401k']
  benefitsSelections?: Record<string, any>; // Store selected benefits data
  department?: string;
  hireDate?: Timestamp | Date;
  location?: string;
  isActive?: boolean; // Whether the user account is active
  enrollmentStatus?: 'not_enrolled' | 'enrolled' | 'pending' | 'cancelled'; // Benefits enrollment status
  companyId?: string; // Company the user belongs to
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
  copays?: Record<string, number>; // e.g., { primaryCare: 20, specialist: 40 }
  coinsurance?: Record<string, number>; // e.g., { inNetwork: 0.2 }
  features?: string[]; // List of highlighted plan features
  contributionAmounts?: {
    employee: number;
    employer?: number;
  };
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
  companyId?: string;
  processing?: {
    startedAt?: Timestamp | Date;
    completedAt?: Timestamp | Date;
    error?: string;
    chunks?: DocumentChunk[]; // For RAG system
  };
  content?: string; // Extracted text content
  vectorId?: string; // ID in vector database
}

// DocumentChunk is defined below

export interface SearchResult {
  documentId: string;
  chunkId: string;
  content: string;
  score: number;
}

// FAQ Schema
export interface FAQ extends DocumentBase {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  priority: 'low' | 'medium' | 'high';
  companyId: string;
  createdBy: string; // User ID who created the FAQ
  viewCount?: number;
  helpfulCount?: number;
  notHelpfulCount?: number;
}

// Document Chunk Schema for RAG
export interface DocumentChunk extends DocumentBase {
  content: string;
  documentId: string;
  chunkIndex: number;
  embedding?: number[];
  metadata?: {
    startIndex: number;
    endIndex: number;
    [key: string]: any;
  };
  companyId: string;
}