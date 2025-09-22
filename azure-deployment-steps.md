# Azure Deployment Steps for Benefits Chatbot

## Prerequisites
- Azure account with contributor rights (morgasonal10@gmail.com)
- Resource Group: `benefits-chatbot-rg`

## Step 1: Create Resource Group
1. Go to Azure Portal: https://portal.azure.com
2. Click "Create a resource"
3. Search for "Resource Group"
4. Create with name: `benefits-chatbot-rg`
5. Region: East US

## Step 2: Deploy Cosmos DB
1. Go to "Create a resource"
2. Search for "Azure Cosmos DB"
3. Select "Core (SQL) - Recommended"
4. Resource Group: `benefits-chatbot-rg`
5. Account Name: `benefits-chatbot-cosmos`
6. Location: East US
7. Capacity mode: Serverless
8. Click "Review + Create" → "Create"

## Step 3: Deploy App Service
1. Go to "Create a resource"
2. Search for "App Service"
3. Resource Group: `benefits-chatbot-rg`
4. Name: `benefits-chatbot-app`
5. Runtime stack: Node.js 18 LTS
6. Operating System: Linux
7. Region: East US
8. Pricing Plan: Basic B1
9. Click "Review + Create" → "Create"

## Step 4: Deploy Storage Account
1. Go to "Create a resource"
2. Search for "Storage account"
3. Resource Group: `benefits-chatbot-rg`
4. Storage account name: `benefitschatbotstorage`
5. Region: East US
6. Performance: Standard
7. Redundancy: LRS
8. Click "Review + Create" → "Create"

## Step 5: Deploy Application Insights
1. Go to "Create a resource"
2. Search for "Application Insights"
3. Resource Group: `benefits-chatbot-rg`
4. Name: `benefits-chatbot-insights`
5. Region: East US
6. Click "Review + Create" → "Create"

## Step 6: Deploy Key Vault
1. Go to "Create a resource"
2. Search for "Key Vault"
3. Resource Group: `benefits-chatbot-rg`
4. Vault name: `benefits-chatbot-vault`
5. Region: East US
6. Pricing tier: Standard
7. Click "Review + Create" → "Create"

## Step 7: Deploy Redis Cache
1. Go to "Create a resource"
2. Search for "Azure Cache for Redis"
3. Resource Group: `benefits-chatbot-rg`
4. DNS name: `benefits-chatbot-redis`
5. Location: East US
6. Pricing tier: Basic C0
7. Click "Review + Create" → "Create"

## Step 8: Deploy Static Web App
1. Go to "Create a resource"
2. Search for "Static Web App"
3. Resource Group: `benefits-chatbot-rg`
4. Name: `benefits-chatbot-web`
5. Region: East US
6. Source: Other
7. Click "Review + Create" → "Create"

## Step 9: Deploy Communication Services
1. Go to "Create a resource"
2. Search for "Communication Services"
3. Resource Group: `benefits-chatbot-rg`
4. Name: `benefits-chatbot-comm`
5. Region: East US
6. Click "Review + Create" → "Create"

## Step 10: Configure Environment Variables
After all services are deployed, you'll need to configure the App Service with these environment variables:

```
AZURE_COSMOS_CONNECTION_STRING=<from Cosmos DB>
AZURE_STORAGE_CONNECTION_STRING=<from Storage Account>
OPENAI_API_KEY=<your OpenAI API key>
AZURE_AD_CLIENT_ID=<from Azure AD>
AZURE_REDIS_CONNECTION_STRING=<from Redis Cache>
AZURE_KEY_VAULT_URL=<from Key Vault>
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=<from Application Insights>
```

## Estimated Monthly Cost: ~$500
- App Service Basic B1: $55
- Cosmos DB Serverless: $50-150
- Storage Account: $20-40
- Application Insights: $30-80
- Key Vault: $3-10
- Redis Cache Basic: $16
- Static Web App: $9
- Communication Services: $10-20
- OpenAI API: $150-250
