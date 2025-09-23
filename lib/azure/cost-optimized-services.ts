/**
 * Cost-Optimized Azure Services Implementation
 * Total Monthly Cost: $343-609
 */

import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { CommunicationServiceClient, CommunicationUserIdentifier } from '@azure/communication-common';
import { EmailClient } from '@azure/communication-email';
import { SmsClient } from '@azure/communication-sms';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { AppConfigurationClient } from '@azure/app-configuration';
import { logger } from '@/lib/logger';

// Azure App Service (Basic B1) - $55/month
export class AzureAppService {
  private static instance: AzureAppService;
  private credential: DefaultAzureCredential;

  private constructor() {
    this.credential = new DefaultAzureCredential();
  }

  static getInstance(): AzureAppService {
    if (!AzureAppService.instance) {
      AzureAppService.instance = new AzureAppService();
    }
    return AzureAppService.instance;
  }

  async getConfiguration(): Promise<Record<string, string>> {
    // Get configuration from Azure App Configuration
    const client = new AppConfigurationClient(
      process.env.AZURE_APP_CONFIG_CONNECTION_STRING!
    );
    
    const settings = client.listConfigurationSettings();
    const config: Record<string, string> = {};
    
    for await (const setting of settings) {
      config[setting.key] = setting.value || '';
    }
    
    return config;
  }
}

// Azure Cosmos DB Serverless - $50-150/month
export class CostOptimizedCosmosService {
  private client: CosmosClient;
  private database: any;
  private containers: Map<string, any> = new Map();

  constructor() {
    this.client = new CosmosClient(process.env.AZURE_COSMOS_CONNECTION_STRING!);
    this.database = this.client.database('benefits-db');
  }

  private async getContainer(containerName: string) {
    if (!this.containers.has(containerName)) {
      const container = this.database.container(containerName);
      this.containers.set(containerName, container);
    }
    return this.containers.get(containerName);
  }

  async createItem<T>(containerName: string, item: Omit<T, 'id'>): Promise<T> {
    const container = await this.getContainer(containerName);
    const itemWithId = { ...item, id: crypto.randomUUID() } as T;
    
    const { resource } = await container.items.create(itemWithId);
    return resource as T;
  }

  async getItem<T>(containerName: string, id: string, partitionKey?: string): Promise<T | null> {
    const container = await this.getContainer(containerName);
    
    try {
      const { resource } = await container.item(id, partitionKey).read();
      return resource as T;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async queryItems<T>(
    containerName: string,
    query: string,
    parameters?: { name: string; value: any }[]
  ): Promise<T[]> {
    const container = await this.getContainer(containerName);
    const { resources } = await container.items.query({
      query,
      parameters: parameters || []
    }).fetchAll();
    
    return resources as T[];
  }
}

// Azure Blob Storage (Hot tier) - $20-40/month
export class CostOptimizedBlobService {
  private client: BlobServiceClient;

  constructor() {
    this.client = new BlobServiceClient(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  }

  async uploadDocument(file: Buffer, fileName: string, contentType: string): Promise<string> {
    const containerClient = this.client.getContainerClient('documents');
    const blobClient = containerClient.getBlockBlobClient(fileName);
    
    await blobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    });
    
    return blobClient.url;
  }

  async getDocumentUrl(fileName: string): Promise<string> {
    const containerClient = this.client.getContainerClient('documents');
    const blobClient = containerClient.getBlockBlobClient(fileName);
    
    // Generate SAS URL for secure access
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1); // 1 hour expiry
    
    return await blobClient.generateSasUrl({
      permissions: 'r' as any,
      expiresOn
    });
  }

  async deleteDocument(fileName: string): Promise<void> {
    const containerClient = this.client.getContainerClient('documents');
    const blobClient = containerClient.getBlockBlobClient(fileName);
    
    await blobClient.delete();
  }
}

// Azure Communication Services - $10-20/month
export class CostOptimizedCommunicationService {
  private emailClient: EmailClient;
  private smsClient: SmsClient;
  private communicationClient: CommunicationServiceClient;
  private connectionString: string;

  constructor() {
    this.connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
    
    if (!this.connectionString) {
      logger.warn('Azure Communication Services connection string not configured');
      this.emailClient = null as any;
      this.smsClient = null as any;
      this.communicationClient = null as any;
      return;
    }

    try {
      this.emailClient = new EmailClient(this.connectionString);
      this.smsClient = new SmsClient(this.connectionString);
      this.communicationClient = new CommunicationServiceClient(this.connectionString);
      
      logger.info('Azure Communication Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure Communication Services', { error });
      this.emailClient = null as any;
      this.smsClient = null as any;
      this.communicationClient = null as any;
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string, from?: string): Promise<boolean> {
    try {
      if (!this.emailClient) {
        logger.warn('Email client not initialized, skipping email send');
        return false;
      }

      const emailMessage = {
        senderAddress: from || process.env.AZURE_COMMUNICATION_EMAIL_FROM || 'noreply@benefits-chatbot.com',
        recipients: {
          to: [{ address: to }]
        },
        content: {
          subject,
          html: htmlContent
        }
      };

      logger.info('Sending email via Azure Communication Services', {
        to,
        subject,
        from: emailMessage.senderAddress
      });

      const poller = await this.emailClient.beginSend(emailMessage);
      const result = await poller.pollUntilDone();

      if (result.status === 'Succeeded') {
        logger.info('Email sent successfully', { to, subject });
        return true;
      } else {
        logger.error('Email sending failed', { to, subject, status: result.status });
        return false;
      }
    } catch (error) {
      logger.error('Failed to send email via Azure Communication Services', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        subject
      });
      return false;
    }
  }

  async sendSMS(to: string, message: string, from?: string): Promise<boolean> {
    try {
      if (!this.smsClient) {
        logger.warn('SMS client not initialized, skipping SMS send');
        return false;
      }

      const smsMessage = {
        from: from || process.env.AZURE_COMMUNICATION_PHONE_NUMBER || '',
        to: [to],
        message
      };

      logger.info('Sending SMS via Azure Communication Services', {
        to,
        from: smsMessage.from,
        messageLength: message.length
      });

      const result = await this.smsClient.send(smsMessage);

      if (result.successful) {
        logger.info('SMS sent successfully', { to, messageId: result.messageId });
        return true;
      } else {
        logger.error('SMS sending failed', { to, error: result.errorMessage });
        return false;
      }
    } catch (error) {
      logger.error('Failed to send SMS via Azure Communication Services', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to
      });
      return false;
    }
  }

  async createCommunicationUser(): Promise<CommunicationUserIdentifier | null> {
    try {
      if (!this.communicationClient) {
        logger.warn('Communication client not initialized, cannot create user');
        return null;
      }

      const user = await this.communicationClient.createUser();
      
      logger.info('Communication user created successfully', {
        userId: user.communicationUserId
      });

      return user;
    } catch (error) {
      logger.error('Failed to create communication user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async deleteCommunicationUser(userId: string): Promise<boolean> {
    try {
      if (!this.communicationClient) {
        logger.warn('Communication client not initialized, cannot delete user');
        return false;
      }

      await this.communicationClient.deleteUser({ communicationUserId: userId });
      
      logger.info('Communication user deleted successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete communication user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return false;
    }
  }

  async sendBulkEmail(recipients: string[], subject: string, htmlContent: string, from?: string): Promise<{
    successful: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        const success = await this.sendEmail(email, subject, htmlContent, from);
        results.push({ email, success });
        
        if (success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }

    logger.info('Bulk email sending completed', {
      total: recipients.length,
      successful,
      failed
    });

    return { successful, failed, results };
  }

  async sendBulkSMS(recipients: string[], message: string, from?: string): Promise<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const phone of recipients) {
      try {
        const success = await this.sendSMS(phone, message, from);
        results.push({ phone, success });
        
        if (success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }

    logger.info('Bulk SMS sending completed', {
      total: recipients.length,
      successful,
      failed
    });

    return { successful, failed, results };
  }
}

// Azure Key Vault - $3-10/month
export class CostOptimizedKeyVaultService {
  private client: SecretClient;

  constructor() {
    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(
      process.env.AZURE_KEY_VAULT_URL!,
      credential
    );
  }

  async getSecret(secretName: string): Promise<string> {
    const secret = await this.client.getSecret(secretName);
    return secret.value || '';
  }

  async setSecret(secretName: string, secretValue: string): Promise<void> {
    await this.client.setSecret(secretName, secretValue);
  }
}

// Azure Cache for Redis (Basic) - $16/month
export class CostOptimizedRedisService {
  private redis: any; // Would use redis client

  constructor() {
    // Initialize Redis client with Azure Cache for Redis
    // const redis = require('redis');
    // this.redis = redis.createClient({
    //   url: process.env.AZURE_REDIS_CONNECTION_STRING
    // });
  }

  async get(key: string): Promise<string | null> {
    // return await this.redis.get(key);
    return null; // Placeholder
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    // if (ttlSeconds) {
    //   await this.redis.setex(key, ttlSeconds, value);
    // } else {
    //   await this.redis.set(key, value);
    // }
  }

  async del(key: string): Promise<void> {
    // await this.redis.del(key);
  }
}

// Export singleton instances
export const azureAppService = AzureAppService.getInstance();
export const cosmosService = new CostOptimizedCosmosService();
export const blobService = new CostOptimizedBlobService();
export const communicationService = new CostOptimizedCommunicationService();
export const keyVaultService = new CostOptimizedKeyVaultService();
export const redisService = new CostOptimizedRedisService();
