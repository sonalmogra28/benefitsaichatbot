# Azure Manual Setup Guide
## For Benefits Assistant Chatbot

### Prerequisites ✅
- Azure account: `mograsonal10@gmail.com`
- Permissions: Contributor, Application Administrator, Key Vault Administrator
- Access to Azure Portal: https://portal.azure.com

### Step 1: Create Resource Group

1. **Go to Azure Portal**: https://portal.azure.com
2. **Search for**: "Resource groups"
3. **Click**: "Create"
4. **Fill in**:
   - **Resource group name**: `benefits-chatbot-rg-dev`
   - **Region**: `East US`
5. **Click**: "Review + create" → "Create"

### Step 2: Create Cosmos DB

1. **Search for**: "Azure Cosmos DB"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Account Name**: `benefits-chatbot-cosmos-dev`
   - **API**: `Core (SQL)`
   - **Location**: `East US`
   - **Capacity mode**: `Serverless`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Cosmos DB account
   - Click "Keys" in the left menu
   - Copy the "URI" and "Primary Key"

### Step 3: Create Storage Account

1. **Search for**: "Storage accounts"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Storage account name**: `benefitschatbotdev`
   - **Region**: `East US`
   - **Performance**: `Standard`
   - **Redundancy**: `LRS`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Storage Account
   - Click "Access keys" in the left menu
   - Copy the "Connection string"

### Step 4: Create Redis Cache

1. **Search for**: "Azure Cache for Redis"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **DNS name**: `benefits-chatbot-redis-dev`
   - **Location**: `East US`
   - **Pricing tier**: `Basic C0`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to the Redis Cache
   - Click "Access keys" in the left menu
   - Copy the "Primary connection string"

### Step 5: Create Application Insights

1. **Search for**: "Application Insights"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-insights-dev`
   - **Region**: `East US`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to Application Insights
   - Click "Overview"
   - Copy the "Connection String"

### Step 6: Create Key Vault

1. **Search for**: "Key vaults"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Vault name**: `benefits-chatbot-vault-dev`
   - **Region**: `East US`
   - **Pricing tier**: `Standard`
4. **Click**: "Review + create" → "Create"
5. **After creation**:
   - Go to Key Vault
   - Click "Overview"
   - Copy the "Vault URI"

### Step 7: Create App Service Plan

1. **Search for**: "App Service plans"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-plan-dev`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **Pricing tier**: `B1 Basic`
4. **Click**: "Review + create" → "Create"

### Step 8: Create Web App

1. **Search for**: "Web App"
2. **Click**: "Create"
3. **Fill in**:
   - **Subscription**: Your subscription
   - **Resource Group**: `benefits-chatbot-rg-dev`
   - **Name**: `benefits-chatbot-dev`
   - **Runtime stack**: `Node 18 LTS`
   - **Operating System**: `Linux`
   - **Region**: `East US`
   - **App Service Plan**: `benefits-chatbot-plan-dev`
4. **Click**: "Review + create" → "Create"

### Step 9: Create Cosmos DB Containers

1. **Go to your Cosmos DB account**
2. **Click**: "Data Explorer"
3. **Click**: "New Container" for each container:

   **Container 1: users**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `users`
   - Partition key: `/id`

   **Container 2: companies**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `companies`
   - Partition key: `/id`

   **Container 3: benefits**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `benefits`
   - Partition key: `/id`

   **Container 4: chats**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `chats`
   - Partition key: `/id`

   **Container 5: documents**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `documents`
   - Partition key: `/id`

   **Container 6: faqs**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `faqs`
   - Partition key: `/id`

   **Container 7: document-chunks**
   - Database ID: `benefits-chatbot-db`
   - Container ID: `document-chunks`
   - Partition key: `/id`

### Step 10: Create Storage Containers

1. **Go to your Storage Account**
2. **Click**: "Containers" in the left menu
3. **Click**: "Container" for each container:

   **Container 1: documents**
   - Name: `documents`
   - Public access level: `Private`

   **Container 2: images**
   - Name: `images`
   - Public access level: `Private`

### Step 11: Update Environment Variables

After creating all resources, update your `.env.local` file with the actual connection strings:

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

### Step 12: Test the Application

1. **Update environment variables** with real Azure credentials
2. **Run**: `npm run dev`
3. **Test**: http://localhost:3000
4. **Verify**: All Azure services are connected

### Estimated Time: 2-3 hours
### Estimated Cost: $50-100/month (development)
