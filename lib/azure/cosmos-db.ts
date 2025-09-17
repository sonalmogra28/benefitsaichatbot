import { CosmosClient } from '@azure/cosmos';

const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || '';
const COSMOS_KEY = process.env.COSMOS_DB_KEY || '';

if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
  throw new Error('Azure Cosmos DB connection details are not configured.');
}

const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY,
});

export const DATABASE_NAME = 'BenefitsChat';
export const CONVERSATIONS_CONTAINER = 'Conversations';
export const USERS_CONTAINER = 'Users';
export const DOCUMENTS_CONTAINER = 'Documents';

export async function getContainer(containerId: string) {
  const { database } = await cosmosClient.databases.createIfNotExists({
    id: DATABASE_NAME,
  });
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
  });
  return container;
}

export default cosmosClient;
