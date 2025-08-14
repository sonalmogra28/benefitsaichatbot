// This file outlines the Firestore data model. It's for reference and not executable code.

// /companies/{companyId}
interface Company {
  id: string;
  name: string;
  domain?: string;
  settings: object;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  isActive: boolean;
  createdAt: Firebase.firestore.Timestamp;
  updatedAt: Firebase.firestore.Timestamp;
}

// /users/{userId}
interface User {
  id: string;
  companyId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'employee' | 'hr_admin' | 'company_admin' | 'super_admin';
  employeeId?: string;
  department?: string;
  hireDate?: Firebase.firestore.Timestamp;
  isActive: boolean;
  createdAt: Firebase.firestore.Timestamp;
  updatedAt: Firebase.firestore.Timestamp;
}

// /companies/{companyId}/benefitPlans/{benefitPlanId}
interface BenefitPlan {
  id: string;
  name: string;
  type: 'health' | 'dental' | 'vision' | 'life' | 'disability' | 'retirement';
  category: string; // e.g., HMO, PPO
  provider: string;
  description?: string;
  monthlyPremiumEmployee?: number;
  monthlyPremiumFamily?: number;
  deductibleIndividual?: number;
  deductibleFamily?: number;
  outOfPocketMaxIndividual?: number;
  outOfPocketMaxFamily?: number;
  effectiveDate: Firebase.firestore.Timestamp;
  endDate?: Firebase.firestore.Timestamp;
  isActive: boolean;
  createdAt: Firebase.firestore.Timestamp;
  updatedAt: Firebase.firestore.Timestamp;
}

// /users/{userId}/benefitEnrollments/{enrollmentId}
interface BenefitEnrollment {
  id: string;
  benefitPlanId: string;
  benefitPlanName: string; // denormalized for easier display
  coverageType: 'individual' | 'family' | 'employee_spouse';
  enrollmentDate: Firebase.firestore.Timestamp;
  effectiveDate: Firebase.firestore.Timestamp;
  monthlyCost: number;
  status: 'active' | 'pending' | 'cancelled';
  createdAt: Firebase.firestore.Timestamp;
  updatedAt: Firebase.firestore.Timestamp;
}

// /companies/{companyId}/documents/{documentId}
interface KnowledgeBaseDocument {
  id: string;
  title: string;
  content: string; // or path to markdown file in Cloud Storage
  documentType: 'policy' | 'guide' | 'faq';
  category: string;
  tags: string[];
  fileUrl?: string; // GCS URL
  processedAt?: Firebase.firestore.Timestamp;
  isPublic: boolean;
  createdBy: string; // userId
  createdAt: Firebase.firestore.Timestamp;
  updatedAt: Firebase.firestore.Timestamp;
}

// /chats/{chatId}
interface Chat {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  visibility: 'private' | 'company';
  createdAt: Firebase.firestore.Timestamp;
}

// /chats/{chatId}/messages/{messageId}
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: any[]; // AI SDK compatible
  attachments?: any[];
  createdAt: Firebase.firestore.Timestamp;
}
