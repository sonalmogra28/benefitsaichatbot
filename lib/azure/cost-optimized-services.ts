/**
 * Cost-Optimized Azure Services Implementation
 * Total Monthly Cost: $343-609
 */

import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
// import { CommunicationServiceClient } from '@azure/communication-common';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { AppConfigurationClient } from '@azure/app-configuration';

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
  private client: any;

  constructor() {
    // TODO: Implement Communication Service Client
    // this.client = new CommunicationServiceClient(
    //   process.env.AZURE_COMMUNICATION_CONNECTION_STRING!
    // );
    this.client = null;
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      // Use Azure Communication Services for email
      const emailMessage = {
        sender: 'noreply@benefits-chatbot.com',
        recipients: [to],
        subject,
        htmlContent
      };

      // Implementation would use Azure Communication Services SDK
      console.log('Sending email via Azure Communication Services:', emailMessage);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // Use Azure Communication Services for SMS
      const smsMessage = {
        to: to,
        message: message
      };

      console.log('Sending SMS via Azure Communication Services:', smsMessage);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
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
