import { getRepositories } from '@/lib/azure/cosmos';
import { FAQ } from '@/lib/db/schema';
import { logger } from '@/lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export class FAQService {
  private faqRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.faqRepository = repositories.faqs;
  }

  async createFAQ(faqData: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<FAQ> {
    try {
      await this.initializeRepository();
      
      const faq: FAQ = {
        id: uuidv4(),
        ...faqData,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
      };

      const response = await this.faqRepository.create(faq);
      
      logger.info('FAQ created successfully', {
        faqId: faq.id,
        companyId: faq.companyId,
        question: faq.question
      });

      return response.resource;
    } catch (error) {
      logger.error('Failed to create FAQ', error, {
        companyId: faqData.companyId,
        question: faqData.question
      });
      throw error;
    }
  }

  async getFAQById(faqId: string, companyId: string): Promise<FAQ | null> {
    try {
      await this.initializeRepository();
      
      const faq = await this.faqRepository.getById(faqId, companyId);
      
      if (faq) {
        // Increment view count
        await this.incrementViewCount(faqId, companyId);
      }

      return faq;
    } catch (error) {
      logger.error('Failed to get FAQ by ID', error, {
        faqId,
        companyId
      });
      throw error;
    }
  }

  async getFAQsByCompany(companyId: string, options?: {
    category?: string;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ faqs: FAQ[]; total: number }> {
    try {
      await this.initializeRepository();
      
      let query = 'SELECT * FROM c WHERE c.companyId = @companyId';
      const parameters: any[] = [{ name: '@companyId', value: companyId }];

      if (options?.category) {
        query += ' AND c.category = @category';
        parameters.push({ name: '@category', value: options.category });
      }

      if (options?.isPublic !== undefined) {
        query += ' AND c.isPublic = @isPublic';
        parameters.push({ name: '@isPublic', value: options.isPublic });
      }

      query += ' ORDER BY c.priority DESC, c.createdAt DESC';

      if (options?.limit) {
        query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
      }

      const { resources } = await this.faqRepository.query(query, parameters);
      
      // Get total count
      const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.companyId = @companyId';
      const countParameters = [{ name: '@companyId', value: companyId }];
      
      if (options?.category) {
        countQuery += ' AND c.category = @category';
        countParameters.push({ name: '@category', value: options.category });
      }

      if (options?.isPublic !== undefined) {
        countQuery += ' AND c.isPublic = @isPublic';
        countParameters.push({ name: '@isPublic', value: options.isPublic });
      }

      const { resources: countResult } = await this.faqRepository.query(countQuery, countParameters);
      const total = countResult[0] || 0;

      logger.info('FAQs retrieved successfully', {
        companyId,
        count: resources.length,
        total,
        filters: options
      });

      return { faqs: resources, total };
    } catch (error) {
      logger.error('Failed to get FAQs by company', error, {
        companyId,
        options
      });
      throw error;
    }
  }

  async updateFAQ(faqId: string, companyId: string, updateData: Partial<Omit<FAQ, 'id' | 'createdAt' | 'companyId'>>): Promise<FAQ> {
    try {
      await this.initializeRepository();
      
      const existingFAQ = await this.faqRepository.getById(faqId, companyId);
      if (!existingFAQ) {
        throw new Error('FAQ not found');
      }

      const updatedFAQ = {
        ...existingFAQ,
        ...updateData,
        updatedAt: new Date(),
      };

      const response = await this.faqRepository.update(faqId, updatedFAQ, companyId);
      
      logger.info('FAQ updated successfully', {
        faqId,
        companyId,
        updateFields: Object.keys(updateData)
      });

      return response.resource;
    } catch (error) {
      logger.error('Failed to update FAQ', error, {
        faqId,
        companyId,
        updateData
      });
      throw error;
    }
  }

  async deleteFAQ(faqId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      await this.faqRepository.delete(faqId, companyId);
      
      logger.info('FAQ deleted successfully', {
        faqId,
        companyId
      });
    } catch (error) {
      logger.error('Failed to delete FAQ', error, {
        faqId,
        companyId
      });
      throw error;
    }
  }

  async searchFAQs(companyId: string, searchTerm: string, options?: {
    category?: string;
    isPublic?: boolean;
    limit?: number;
  }): Promise<FAQ[]> {
    try {
      await this.initializeRepository();
      
      let query = `
        SELECT * FROM c 
        WHERE c.companyId = @companyId 
        AND (CONTAINS(LOWER(c.question), LOWER(@searchTerm)) 
             OR CONTAINS(LOWER(c.answer), LOWER(@searchTerm))
             OR CONTAINS(LOWER(c.category), LOWER(@searchTerm)))
      `;
      
      const parameters: any[] = [
        { name: '@companyId', value: companyId },
        { name: '@searchTerm', value: searchTerm }
      ];

      if (options?.category) {
        query += ' AND c.category = @category';
        parameters.push({ name: '@category', value: options.category });
      }

      if (options?.isPublic !== undefined) {
        query += ' AND c.isPublic = @isPublic';
        parameters.push({ name: '@isPublic', value: options.isPublic });
      }

      query += ' ORDER BY c.priority DESC, c.createdAt DESC';

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      const { resources } = await this.faqRepository.query(query, parameters);
      
      logger.info('FAQ search completed', {
        companyId,
        searchTerm,
        resultCount: resources.length,
        filters: options
      });

      return resources;
    } catch (error) {
      logger.error('Failed to search FAQs', error, {
        companyId,
        searchTerm,
        options
      });
      throw error;
    }
  }

  async incrementViewCount(faqId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      const faq = await this.faqRepository.getById(faqId, companyId);
      if (faq) {
        await this.faqRepository.update(faqId, {
          viewCount: (faq.viewCount || 0) + 1,
          updatedAt: new Date()
        }, companyId);
      }
    } catch (error) {
      logger.error('Failed to increment view count', error, {
        faqId,
        companyId
      });
      // Don't throw error for view count increment failure
    }
  }

  async incrementHelpfulCount(faqId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      const faq = await this.faqRepository.getById(faqId, companyId);
      if (faq) {
        await this.faqRepository.update(faqId, {
          helpfulCount: (faq.helpfulCount || 0) + 1,
          updatedAt: new Date()
        }, companyId);
      }
    } catch (error) {
      logger.error('Failed to increment helpful count', error, {
        faqId,
        companyId
      });
      throw error;
    }
  }

  async incrementNotHelpfulCount(faqId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      const faq = await this.faqRepository.getById(faqId, companyId);
      if (faq) {
        await this.faqRepository.update(faqId, {
          notHelpfulCount: (faq.notHelpfulCount || 0) + 1,
          updatedAt: new Date()
        }, companyId);
      }
    } catch (error) {
      logger.error('Failed to increment not helpful count', error, {
        faqId,
        companyId
      });
      throw error;
    }
  }

  async getFAQCategories(companyId: string): Promise<string[]> {
    try {
      await this.initializeRepository();
      
      const query = `
        SELECT DISTINCT c.category 
        FROM c 
        WHERE c.companyId = @companyId 
        AND c.category IS NOT NULL 
        AND c.category != ''
        ORDER BY c.category
      `;
      
      const parameters = [{ name: '@companyId', value: companyId }];
      const { resources } = await this.faqRepository.query(query, parameters);
      
      return resources.map((item: any) => item.category);
    } catch (error) {
      logger.error('Failed to get FAQ categories', error, {
        companyId
      });
      throw error;
    }
  }
}

// Export singleton instance
export const faqService = new FAQService();
