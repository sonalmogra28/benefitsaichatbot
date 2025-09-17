import { CosmosClient, Database, Container, ItemResponse, FeedResponse } from '@azure/cosmos';
import { azureConfig, getCosmosDbConfig } from './config';
import { logger } from '@/lib/logging/logger';

// Initialize Cosmos DB client
const cosmosConfig = getCosmosDbConfig();
const client = new CosmosClient({
  endpoint: cosmosConfig.endpoint,
  key: cosmosConfig.key,
});

let database: Database;
let containers: {
  users: Container;
  companies: Container;
  benefits: Container;
  chats: Container;
  documents: Container;
};

// Initialize database and containers
export const initializeCosmosDb = async () => {
  try {
    database = await client.database(cosmosConfig.databaseId);
    
    // Create containers if they don't exist
    containers = {
      users: await database.containers.createIfNotExists({
        id: azureConfig.cosmosContainerUsers,
        partitionKey: '/id',
        indexingPolicy: {
          includedPaths: [
            { path: '/*' }
          ],
          excludedPaths: [
            { path: '/"_etag"/?' }
          ]
        }
      }).then(result => result.container),
      
      companies: await database.containers.createIfNotExists({
        id: azureConfig.cosmosContainerCompanies,
        partitionKey: '/id',
        indexingPolicy: {
          includedPaths: [
            { path: '/*' }
          ],
          excludedPaths: [
            { path: '/"_etag"/?' }
          ]
        }
      }).then(result => result.container),
      
      benefits: await database.containers.createIfNotExists({
        id: azureConfig.cosmosContainerBenefits,
        partitionKey: '/companyId',
        indexingPolicy: {
          includedPaths: [
            { path: '/*' }
          ],
          excludedPaths: [
            { path: '/"_etag"/?' }
          ]
        }
      }).then(result => result.container),
      
      chats: await database.containers.createIfNotExists({
        id: azureConfig.cosmosContainerChats,
        partitionKey: '/userId',
        indexingPolicy: {
          includedPaths: [
            { path: '/*' }
          ],
          excludedPaths: [
            { path: '/"_etag"/?' }
          ]
        }
      }).then(result => result.container),
      
      documents: await database.containers.createIfNotExists({
        id: azureConfig.cosmosContainerDocuments,
        partitionKey: '/companyId',
        indexingPolicy: {
          includedPaths: [
            { path: '/*' }
          ],
          excludedPaths: [
            { path: '/"_etag"/?' }
          ]
        }
      }).then(result => result.container),
    };

    logger.info('Cosmos DB initialized successfully', {
      database: cosmosConfig.databaseId,
      containers: Object.keys(containers)
    });

    return { database, containers };
  } catch (error) {
    logger.error('Failed to initialize Cosmos DB', error);
    throw error;
  }
};

// Generic repository class for Cosmos DB operations
export class CosmosRepository<T extends { id: string }> {
  constructor(private container: Container) {}

  async create(item: T): Promise<ItemResponse<T>> {
    try {
      const response = await this.container.items.create(item);
      logger.info('Item created in Cosmos DB', {
        container: this.container.id,
        itemId: item.id,
        statusCode: response.statusCode
      });
      return response;
    } catch (error) {
      logger.error('Failed to create item in Cosmos DB', error, {
        container: this.container.id,
        itemId: item.id
      });
      throw error;
    }
  }

  async getById(id: string, partitionKey?: string): Promise<T | null> {
    try {
      const response = await this.container.item(id, partitionKey || id).read<T>();
      if (response.statusCode === 404) {
        return null;
      }
      return response.resource;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      logger.error('Failed to get item from Cosmos DB', error, {
        container: this.container.id,
        itemId: id
      });
      throw error;
    }
  }

  async update(id: string, item: Partial<T>, partitionKey?: string): Promise<ItemResponse<T>> {
    try {
      const response = await this.container.item(id, partitionKey || id).replace({
        ...item,
        id,
        _ts: Date.now() / 1000
      });
      logger.info('Item updated in Cosmos DB', {
        container: this.container.id,
        itemId: id,
        statusCode: response.statusCode
      });
      return response;
    } catch (error) {
      logger.error('Failed to update item in Cosmos DB', error, {
        container: this.container.id,
        itemId: id
      });
      throw error;
    }
  }

  async delete(id: string, partitionKey?: string): Promise<ItemResponse<T>> {
    try {
      const response = await this.container.item(id, partitionKey || id).delete();
      logger.info('Item deleted from Cosmos DB', {
        container: this.container.id,
        itemId: id,
        statusCode: response.statusCode
      });
      return response;
    } catch (error) {
      logger.error('Failed to delete item from Cosmos DB', error, {
        container: this.container.id,
        itemId: id
      });
      throw error;
    }
  }

  async query<TResult = T>(
    query: string,
    parameters?: Array<{ name: string; value: any }>
  ): Promise<FeedResponse<TResult>> {
    try {
      const { resources } = await this.container.items
        .query<TResult>({
          query,
          parameters
        })
        .fetchAll();
      
      logger.info('Query executed in Cosmos DB', {
        container: this.container.id,
        query,
        resultCount: resources.length
      });

      return {
        resources,
        hasMoreResults: false,
        continuationToken: undefined,
        requestCharge: 0,
        activityId: '',
        etag: '',
        responseHeaders: {}
      };
    } catch (error) {
      logger.error('Failed to execute query in Cosmos DB', error, {
        container: this.container.id,
        query
      });
      throw error;
    }
  }

  async list<TResult = T>(
    partitionKey?: string,
    limit?: number
  ): Promise<TResult[]> {
    try {
      let query = this.container.items.query<TResult>('SELECT * FROM c');
      
      if (partitionKey) {
        query = query.query('c.partitionKey = @partitionKey', { partitionKey });
      }
      
      if (limit) {
        query = query.take(limit);
      }

      const { resources } = await query.fetchAll();
      
      logger.info('List query executed in Cosmos DB', {
        container: this.container.id,
        partitionKey,
        limit,
        resultCount: resources.length
      });

      return resources;
    } catch (error) {
      logger.error('Failed to list items from Cosmos DB', error, {
        container: this.container.id,
        partitionKey
      });
      throw error;
    }
  }
}

// Initialize repositories
let repositories: {
  users: CosmosRepository<any>;
  companies: CosmosRepository<any>;
  benefits: CosmosRepository<any>;
  chats: CosmosRepository<any>;
  documents: CosmosRepository<any>;
};

export const getRepositories = async () => {
  if (!repositories) {
    const { containers } = await initializeCosmosDb();
    repositories = {
      users: new CosmosRepository(containers.users),
      companies: new CosmosRepository(containers.companies),
      benefits: new CosmosRepository(containers.benefits),
      chats: new CosmosRepository(containers.chats),
      documents: new CosmosRepository(containers.documents),
    };
  }
  return repositories;
};

// Export the client for advanced operations
export { client as cosmosClient, database, containers };
