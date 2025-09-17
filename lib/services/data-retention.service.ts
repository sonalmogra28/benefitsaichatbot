import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface DataRetentionPolicy {
  id: string;
  companyId: string;
  dataType: 'chat_messages' | 'documents' | 'user_data' | 'analytics' | 'api_calls';
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RetentionJob {
  id: string;
  companyId: string;
  dataType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsDeleted: number;
  error?: string;
}

export class DataRetentionService {
  private documentsRepository: any;
  private usersRepository: any;
  private chatsRepository: any;

  constructor() {
    this.initializeRepositories();
  }

  private async initializeRepositories() {
    const repositories = await getRepositories();
    this.documentsRepository = repositories.documents;
    this.usersRepository = repositories.users;
    this.chatsRepository = repositories.chats;
  }

  /**
   * Create a data retention policy
   */
  async createRetentionPolicy(
    companyId: string,
    policyData: Omit<DataRetentionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>,
    createdBy: string
  ): Promise<DataRetentionPolicy> {
    try {
      await this.initializeRepositories();
      
      const policy: DataRetentionPolicy = {
        id: `retention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        companyId,
        ...policyData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      await this.documentsRepository.create({
        ...policy,
        type: 'data_retention_policy'
      });

      logger.info('Data retention policy created', {
        policyId: policy.id,
        companyId,
        dataType: policy.dataType,
        retentionDays: policy.retentionDays
      });

      return policy;
    } catch (error) {
      logger.error('Failed to create data retention policy', error, {
        companyId,
        dataType: policyData.dataType
      });
      throw error;
    }
  }

  /**
   * Get retention policies for a company
   */
  async getRetentionPolicies(companyId: string): Promise<DataRetentionPolicy[]> {
    try {
      await this.initializeRepositories();
      
      const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'data_retention_policy' ORDER BY c.createdAt DESC`;
      const parameters = [{ name: '@companyId', value: companyId }];
      
      const { resources } = await this.documentsRepository.query(query, parameters);

      return resources;
    } catch (error) {
      logger.error('Failed to get retention policies', error, {
        companyId
      });
      throw error;
    }
  }

  /**
   * Update a retention policy
   */
  async updateRetentionPolicy(
    policyId: string,
    companyId: string,
    updates: Partial<DataRetentionPolicy>
  ): Promise<DataRetentionPolicy> {
    try {
      await this.initializeRepositories();
      
      const existingPolicy = await this.documentsRepository.getById(policyId, companyId);
      if (!existingPolicy) {
        throw new Error('Retention policy not found');
      }

      const updatedPolicy = {
        ...existingPolicy,
        ...updates,
        id: policyId,
        updatedAt: new Date()
      };

      await this.documentsRepository.update(policyId, updatedPolicy, companyId);

      logger.info('Data retention policy updated', {
        policyId,
        companyId,
        updateFields: Object.keys(updates)
      });

      return updatedPolicy;
    } catch (error) {
      logger.error('Failed to update retention policy', error, {
        policyId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Delete a retention policy
   */
  async deleteRetentionPolicy(policyId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepositories();
      
      await this.documentsRepository.delete(policyId, companyId);

      logger.info('Data retention policy deleted', {
        policyId,
        companyId
      });
    } catch (error) {
      logger.error('Failed to delete retention policy', error, {
        policyId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Execute data retention for a company
   */
  async executeDataRetention(companyId: string): Promise<RetentionJob[]> {
    try {
      await this.initializeRepositories();
      
      const policies = await this.getRetentionPolicies(companyId);
      const activePolicies = policies.filter(p => p.isActive);
      const jobs: RetentionJob[] = [];

      for (const policy of activePolicies) {
        const job = await this.executeRetentionPolicy(companyId, policy);
        jobs.push(job);
      }

      logger.info('Data retention execution completed', {
        companyId,
        policiesProcessed: activePolicies.length,
        jobsCreated: jobs.length
      });

      return jobs;
    } catch (error) {
      logger.error('Failed to execute data retention', error, {
        companyId
      });
      throw error;
    }
  }

  /**
   * Execute a specific retention policy
   */
  private async executeRetentionPolicy(
    companyId: string,
    policy: DataRetentionPolicy
  ): Promise<RetentionJob> {
    const job: RetentionJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      dataType: policy.dataType,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsDeleted: 0
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.deleteAfterDays);

      let recordsProcessed = 0;
      let recordsDeleted = 0;

      switch (policy.dataType) {
        case 'chat_messages':
          const result = await this.cleanupChatMessages(companyId, cutoffDate);
          recordsProcessed = result.processed;
          recordsDeleted = result.deleted;
          break;
        case 'documents':
          const docResult = await this.cleanupDocuments(companyId, cutoffDate);
          recordsProcessed = docResult.processed;
          recordsDeleted = docResult.deleted;
          break;
        case 'user_data':
          const userResult = await this.cleanupUserData(companyId, cutoffDate);
          recordsProcessed = userResult.processed;
          recordsDeleted = userResult.deleted;
          break;
        case 'api_calls':
          const apiResult = await this.cleanupApiCalls(companyId, cutoffDate);
          recordsProcessed = apiResult.processed;
          recordsDeleted = apiResult.deleted;
          break;
        default:
          throw new Error(`Unsupported data type: ${policy.dataType}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.recordsProcessed = recordsProcessed;
      job.recordsDeleted = recordsDeleted;

      logger.info('Retention policy executed successfully', {
        jobId: job.id,
        companyId,
        dataType: policy.dataType,
        recordsProcessed,
        recordsDeleted
      });

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = (error as Error).message;

      logger.error('Retention policy execution failed', error, {
        jobId: job.id,
        companyId,
        dataType: policy.dataType
      });
    }

    // Store job result
    await this.documentsRepository.create({
      ...job,
      type: 'retention_job',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return job;
  }

  /**
   * Cleanup old chat messages
   */
  private async cleanupChatMessages(companyId: string, cutoffDate: Date): Promise<{
    processed: number;
    deleted: number;
  }> {
    const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'chat_message' AND c.createdAt < @cutoffDate`;
    const parameters = [
      { name: '@companyId', value: companyId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];
    
    const { resources } = await this.chatsRepository.query(query, parameters);
    let deleted = 0;

    for (const message of resources) {
      await this.chatsRepository.delete(message.id, companyId);
      deleted++;
    }

    return { processed: resources.length, deleted };
  }

  /**
   * Cleanup old documents
   */
  private async cleanupDocuments(companyId: string, cutoffDate: Date): Promise<{
    processed: number;
    deleted: number;
  }> {
    const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'document' AND c.createdAt < @cutoffDate`;
    const parameters = [
      { name: '@companyId', value: companyId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];
    
    const { resources } = await this.documentsRepository.query(query, parameters);
    let deleted = 0;

    for (const document of resources) {
      await this.documentsRepository.delete(document.id, companyId);
      deleted++;
    }

    return { processed: resources.length, deleted };
  }

  /**
   * Cleanup old user data
   */
  private async cleanupUserData(companyId: string, cutoffDate: Date): Promise<{
    processed: number;
    deleted: number;
  }> {
    const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'user' AND c.lastLoginAt < @cutoffDate AND c.status = 'inactive'`;
    const parameters = [
      { name: '@companyId', value: companyId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];
    
    const { resources } = await this.usersRepository.query(query, parameters);
    let deleted = 0;

    for (const user of resources) {
      await this.usersRepository.delete(user.id, companyId);
      deleted++;
    }

    return { processed: resources.length, deleted };
  }

  /**
   * Cleanup old API calls
   */
  private async cleanupApiCalls(companyId: string, cutoffDate: Date): Promise<{
    processed: number;
    deleted: number;
  }> {
    const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'api_call' AND c.timestamp < @cutoffDate`;
    const parameters = [
      { name: '@companyId', value: companyId },
      { name: '@cutoffDate', value: cutoffDate.toISOString() }
    ];
    
    const { resources } = await this.documentsRepository.query(query, parameters);
    let deleted = 0;

    for (const apiCall of resources) {
      await this.documentsRepository.delete(apiCall.id, companyId);
      deleted++;
    }

    return { processed: resources.length, deleted };
  }

  /**
   * Get retention job history
   */
  async getRetentionJobHistory(companyId: string, limit: number = 50): Promise<RetentionJob[]> {
    try {
      await this.initializeRepositories();
      
      const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'retention_job' ORDER BY c.startedAt DESC`;
      const parameters = [{ name: '@companyId', value: companyId }];
      
      const { resources } = await this.documentsRepository.query(query, parameters);

      return resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get retention job history', error, {
        companyId
      });
      throw error;
    }
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();
