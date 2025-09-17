import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage connection string not configured.');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);

export const DOCUMENTS_CONTAINER_NAME = 'documents';

export async function getContainerClient(containerName: string) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

export default blobServiceClient;
