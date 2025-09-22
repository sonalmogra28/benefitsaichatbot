import { logger } from '@/lib/logger';
import { cosmosClient } from '@/lib/azure/cosmos';

export interface Company {
  id: string;
  name: string;
  domain: string;
  adminId: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

class CompanyService {
  private container = cosmosClient.database('BenefitsDB').container('companies');

  async getCompanies(options: { page: number; limit: number; adminId?: string }): Promise<Company[]> {
    try {
      let query = 'SELECT * FROM c WHERE c.isActive = true';
      const parameters: any[] = [];

      if (options.adminId) {
        query += ' AND c.adminId = @adminId';
        parameters.push({ name: '@adminId', value: options.adminId });
      }

      query += ' ORDER BY c.createdAt DESC';

      const { resources } = await this.container.items.query<Company>({
        query,
        parameters
      }).fetchAll();

      const offset = (options.page - 1) * options.limit;
      return resources.slice(offset, offset + options.limit);
    } catch (error) {
      logger.error('Error fetching companies', { error, options });
      return [];
    }
  }

  async createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    try {
      const company: Company = {
        ...companyData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { resource } = await this.container.items.create(company);
      return resource!;
    } catch (error) {
      logger.error('Error creating company', { error, companyData });
      throw error;
    }
  }

  async getCompanyById(id: string): Promise<Company | null> {
    try {
      const { resource } = await this.container.item(id).read<Company>();
      return resource || null;
    } catch (error) {
      if ((error as any).code === 404) {
        return null;
      }
      logger.error('Error fetching company', { error, companyId: id });
      throw error;
    }
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    try {
      const existingCompany = await this.getCompanyById(id);
      if (!existingCompany) {
        throw new Error('Company not found');
      }

      const updatedCompany: Company = {
        ...existingCompany,
        ...updates,
        updatedAt: new Date()
      };

      const { resource } = await this.container.item(id).replace(updatedCompany);
      return resource!;
    } catch (error) {
      logger.error('Error updating company', { error, companyId: id, updates });
      throw error;
    }
  }
}

export const companyService = new CompanyService();
