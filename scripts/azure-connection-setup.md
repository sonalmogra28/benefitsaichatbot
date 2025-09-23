# Azure Connection Setup Guide

## Prerequisites
- Azure account access: `mograsonal10@gmail.com`
- Azure CLI installed (or use Azure Portal)

## Step 1: Azure Portal Setup

### 1.1 Login to Azure Portal
1. Go to https://portal.azure.com
2. Login with `mograsonal10@gmail.com`
3. Select your subscription

### 1.2 Create Resource Group
1. Search for "Resource groups"
2. Click "Create"
3. Name: `benefits-chatbot-rg-dev`
4. Region: `East US`
5. Click "Review + create"

## Step 2: Create Azure Services

### 2.1 Cosmos DB
1. Search for "Azure Cosmos DB"
2. Click "Create"
3. Select "Core (SQL)" API
4. Resource Group: `benefits-chatbot-rg-dev`
5. Account Name: `benefits-chatbot-cosmos-dev`
6. Location: `East US`
7. Capacity mode: `Serverless`
8. Click "Review + create"

### 2.2 Storage Account
1. Search for "Storage accounts"
2. Click "Create"
3. Resource Group: `benefits-chatbot-rg-dev`
4. Storage account name: `benefitschatbotdev`
5. Location: `East US`
6. Performance: `Standard`
7. Redundancy: `LRS`
8. Click "Review + create"

### 2.3 Redis Cache
1. Search for "Azure Cache for Redis"
2. Click "Create"
3. Resource Group: `benefits-chatbot-rg-dev`
4. DNS name: `benefits-chatbot-redis-dev`
5. Location: `East US`
6. Pricing tier: `Basic C0`
7. Click "Review + create"

### 2.4 Application Insights
1. Search for "Application Insights"
2. Click "Create"
3. Resource Group: `benefits-chatbot-rg-dev`
4. Name: `benefits-chatbot-insights-dev`
5. Region: `East US`
6. Click "Review + create"

### 2.5 Key Vault
1. Search for "Key vaults"
2. Click "Create"
3. Resource Group: `benefits-chatbot-rg-dev`
4. Vault name: `benefits-chatbot-vault-dev`
5. Region: `East US`
6. Pricing tier: `Standard`
7. Click "Review + create"

## Step 3: Get Connection Strings and Keys

### 3.1 Cosmos DB
1. Go to your Cosmos DB account
2. Click "Keys" in the left menu
3. Copy the "URI" and "Primary Key"

### 3.2 Storage Account
1. Go to your Storage Account
2. Click "Access keys" in the left menu
3. Copy the "Connection string"

### 3.3 Redis Cache
1. Go to your Redis Cache
2. Click "Access keys" in the left menu
3. Copy the "Primary connection string"

### 3.4 Application Insights
1. Go to your Application Insights
2. Click "Overview"
3. Copy the "Connection String"

### 3.5 Key Vault
1. Go to your Key Vault
2. Click "Overview"
3. Copy the "Vault URI"

## Step 4: Update Environment Variables

Create a `.env.local` file with the following structure:

```env
# Azure Core Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=benefits-chatbot-rg-dev
AZURE_LOCATION=East US

# Azure Cosmos DB Configuration
AZURE_COSMOS_ENDPOINT=https://benefits-chatbot-cosmos-dev.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-primary-key
AZURE_COSMOS_DATABASE=benefits-chatbot-db
AZURE_COSMOS_CONTAINER_USERS=users
AZURE_COSMOS_CONTAINER_COMPANIES=companies
AZURE_COSMOS_CONTAINER_BENEFITS=benefits
AZURE_COSMOS_CONTAINER_CHATS=chats
AZURE_COSMOS_CONTAINER_DOCUMENTS=documents
AZURE_COSMOS_CONTAINER_FAQS=faqs
AZURE_COSMOS_CONTAINER_DOCUMENT_CHUNKS=document-chunks

# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=benefitschatbotdev
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER_DOCUMENTS=documents
AZURE_STORAGE_CONTAINER_IMAGES=images

# Azure Cache for Redis Configuration
AZURE_REDIS_HOST=benefits-chatbot-redis-dev.redis.cache.windows.net
AZURE_REDIS_PORT=6380
AZURE_REDIS_PASSWORD=your-redis-password
AZURE_REDIS_SSL=true
REDIS_URL=rediss://:your-redis-password@benefits-chatbot-redis-dev.redis.cache.windows.net:6380

# Azure Monitor Configuration
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
AZURE_LOG_ANALYTICS_WORKSPACE_ID=your-workspace-id
AZURE_LOG_ANALYTICS_SHARED_KEY=your-shared-key

# Azure Key Vault Configuration
AZURE_KEY_VAULT_URL=https://benefits-chatbot-vault-dev.vault.azure.net/
AZURE_KEY_VAULT_CLIENT_ID=your-keyvault-client-id
AZURE_KEY_VAULT_CLIENT_SECRET=your-keyvault-client-secret

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key

# Rate Limiting Configuration
RATE_LIMIT_REDIS_URL=rediss://:your-redis-password@benefits-chatbot-redis-dev.redis.cache.windows.net:6380

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt

# Email Configuration
RESEND_API_KEY=your-resend-api-key

# Development Configuration
AZURE_USE_EMULATOR=false
AZURE_DEBUG_MODE=true
LOG_LEVEL=debug
```

## Step 5: Test Azure Connection

After setting up the environment variables, test the connection:

```bash
npm run dev
```

The application should now connect to Azure services instead of using local emulators.

## Step 6: Create Required Containers

### 6.1 Cosmos DB Containers
Create the following containers in your Cosmos DB:
- `users` (Partition key: `/id`)
- `companies` (Partition key: `/id`)
- `benefits` (Partition key: `/id`)
- `chats` (Partition key: `/id`)
- `documents` (Partition key: `/id`)
- `faqs` (Partition key: `/id`)
- `document-chunks` (Partition key: `/id`)

### 6.2 Storage Containers
Create the following containers in your Storage Account:
- `documents`
- `images`

## Troubleshooting

### Common Issues:
1. **Connection refused**: Check if the service is running and accessible
2. **Authentication failed**: Verify the connection strings and keys
3. **Resource not found**: Ensure all resources are created in the same resource group

### Next Steps:
1. Complete the Azure setup
2. Update environment variables
3. Test the connection
4. Deploy to Azure App Service
