/**
 * PDF Document Processor
 * Handles PDF parsing and text extraction for benefits documents
 */

import { Document } from '@/lib/db/tenant-schema';
import { logger } from '@/lib/logging/logger';

export interface PDFProcessingResult {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pages: number;
    language: string;
    category: 'benefits' | 'policy' | 'enrollment' | 'other';
    extractedData?: {
      planName?: string;
      effectiveDate?: string;
      coverageYear?: string;
      premiums?: Array<{
        tier: string;
        monthly: number;
        biweekly: number;
      }>;
      deductibles?: Array<{
        plan: string;
        individual: number;
        family: number;
      }>;
      copays?: Array<{
        plan: string;
        primaryCare: number;
        specialist: number;
        emergency: number;
      }>;
    };
  };
}

export class PDFProcessor {
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly supportedMimeTypes = [
    'application/pdf',
    'application/x-pdf',
  ];

  async processPDF(
    file: Buffer,
    filename: string,
    tenantId: string,
    uploadedBy: string
  ): Promise<PDFProcessingResult> {
    try {
      // Validate file
      this.validateFile(file, filename);

      // Extract text from PDF
      const extractedText = await this.extractTextFromPDF(file);

      // Parse benefits-specific data
      const metadata = await this.parseBenefitsMetadata(extractedText, filename);

      // Categorize document
      const category = this.categorizeDocument(extractedText, filename);

      logger.info('PDF processed successfully', {
        filename,
        tenantId,
        pages: metadata.pages,
        category,
      });

      return {
        text: extractedText,
        metadata: {
          ...metadata,
          category,
        },
      };
    } catch (error) {
      logger.error('PDF processing failed', {
        filename,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private validateFile(file: Buffer, filename: string): void {
    if (file.length > this.maxFileSize) {
      throw new Error(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (file.length === 0) {
      throw new Error('File is empty');
    }

    // Basic PDF validation - check for PDF header
    const pdfHeader = file.toString('ascii', 0, 4);
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF file');
    }
  }

  private async extractTextFromPDF(file: Buffer): Promise<string> {
    // In a real implementation, you would use a PDF parsing library like:
    // - pdf-parse
    // - pdf2pic + OCR
    // - Azure Form Recognizer
    // - Google Document AI
    
    // For now, we'll simulate text extraction
    // This would be replaced with actual PDF parsing logic
    
    try {
      // Simulate PDF text extraction
      const mockText = this.generateMockPDFText();
      return mockText;
    } catch (error) {
      logger.error('PDF text extraction failed', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to extract text from PDF');
    }
  }

  private generateMockPDFText(): string {
    // This would be replaced with actual PDF text extraction
    return `
AMERIVET BENEFITS SUMMARY
2024-2025 Open Enrollment

MEDICAL PLANS

BCBSTX Standard HSA
- Employee Cost: $86.84/month, $40.08/biweekly
- Deductible: $2,000 individual, $4,000 family
- Coinsurance: 20%
- Copays: $20 primary care, $20 specialist, $20 emergency
- Out-of-pocket max: $4,000 individual, $8,000 family

BCBSTX Enhanced HSA
- Employee Cost: $160.36/month, $74.01/biweekly
- Deductible: $2,000 individual, $4,000 family
- Coinsurance: 20%
- Copays: $20 primary care, $20 specialist, $20 emergency
- Out-of-pocket max: $4,000 individual, $8,000 family

BCBSTX PPO
- Employee Cost: $267.42/month, $123.42/biweekly
- Deductible: $500 individual, $1,000 family
- Coinsurance: 20%
- Copays: $20 primary care, $20 specialist, $20 emergency
- Out-of-pocket max: $2,000 individual, $4,000 family

Kaiser Standard HMO (CA, OR, WA only)
- Employee Cost: $196.30/month, $90.60/biweekly
- Deductible: $0
- Copays: $20 primary care, $20 specialist, $20 emergency
- Out-of-pocket max: $2,000 individual, $4,000 family

Kaiser Enhanced HMO (CA, OR, WA only)
- Employee Cost: $379.26/month, $175.04/biweekly
- Deductible: $0
- Copays: $10 primary care, $10 specialist, $10 emergency
- Out-of-pocket max: $1,000 individual, $2,000 family

DENTAL COVERAGE
- Employee Cost: $28.90/month, $13.34/biweekly
- Deductible: $50 individual, $150 family
- Coinsurance: 20%
- Preventive care: 100% covered
- Basic services: 80% covered
- Major services: 50% covered

VISION COVERAGE
- Employee Cost: $5.24/month, $2.42/biweekly
- Annual eye exam covered
- Frame allowance included
- Lens coverage included
- Contact lens allowance

LIFE INSURANCE
- Basic Life & AD&D: $25,000 (employer-paid)
- Voluntary Life: Employee-paid, age-banded rates

DISABILITY INSURANCE
- Short-term Disability: Employee-paid, 14-day elimination period
- Long-term Disability: Employee-paid, 180-day elimination period

ELIGIBILITY
- Full-time employees (30+ hours/week)
- Coverage effective: 1st of month following hire
- Dependents: spouse, domestic partner, children under 26

OPEN ENROLLMENT
- Period: TBD (Brandon to provide dates)
- Effective Date: October 1, 2024
- HSA/FSA/Commuter: January 1, 2025
    `.trim();
  }

  private async parseBenefitsMetadata(text: string, filename: string): Promise<{
    title?: string;
    author?: string;
    pages: number;
    language: string;
    extractedData?: any;
  }> {
    // Parse benefits-specific data from text
    const extractedData: any = {};

    // Extract plan names
    const planMatches = text.match(/(BCBSTX|Kaiser)\s+(Standard|Enhanced|PPO|HMO|HSA)/g);
    if (planMatches) {
      extractedData.planNames = planMatches;
    }

    // Extract premiums
    const premiumMatches = text.match(/\$[\d,]+\.\d{2}\/month/g);
    if (premiumMatches) {
      extractedData.premiums = premiumMatches.map(p => ({
        amount: parseFloat(p.replace(/[$,]/g, '')),
        period: 'monthly',
      }));
    }

    // Extract deductibles
    const deductibleMatches = text.match(/\$[\d,]+(?:,\d{3})*\s+(?:individual|family)/g);
    if (deductibleMatches) {
      extractedData.deductibles = deductibleMatches;
    }

    // Extract effective dates
    const dateMatches = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
    if (dateMatches) {
      extractedData.effectiveDates = dateMatches;
    }

    return {
      title: this.extractTitle(text, filename),
      author: 'Amerivet',
      pages: this.estimatePages(text),
      language: 'en',
      extractedData,
    };
  }

  private extractTitle(text: string, filename: string): string {
    // Try to extract title from text
    const titleMatch = text.match(/^([A-Z\s]+BENEFITS[A-Z\s]*)/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Fallback to filename
    return filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  }

  private estimatePages(text: string): number {
    // Rough estimation based on text length
    // Average PDF page has ~500-1000 words
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 750));
  }

  private categorizeDocument(text: string, filename: string): 'benefits' | 'policy' | 'enrollment' | 'other' {
    const lowerText = text.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    if (lowerText.includes('open enrollment') || lowerText.includes('enrollment')) {
      return 'enrollment';
    }

    if (lowerText.includes('policy') || lowerText.includes('terms') || lowerText.includes('conditions')) {
      return 'policy';
    }

    if (lowerText.includes('benefits') || lowerText.includes('coverage') || lowerText.includes('plan')) {
      return 'benefits';
    }

    return 'other';
  }
}

export const pdfProcessor = new PDFProcessor();
