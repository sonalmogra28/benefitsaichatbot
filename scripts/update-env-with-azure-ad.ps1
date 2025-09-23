# Update Environment Variables with Azure AD B2C Details
# Run this after getting the app registration details

Write-Host "🔐 Updating environment variables with Azure AD B2C details..." -ForegroundColor Green

# Prompt for Azure AD B2C details
$tenantId = Read-Host "Enter Directory (tenant) ID"
$clientId = Read-Host "Enter Application (client) ID"
$clientSecret = Read-Host "Enter Client Secret"

# Create .env.local file with Azure AD B2C configuration
$envContent = @"
# Development Environment Variables
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Azure AD B2C Configuration
AZURE_TENANT_ID=$tenantId
AZURE_CLIENT_ID=$clientId
AZURE_CLIENT_SECRET=$clientSecret
AZURE_AD_B2C_TENANT_NAME=benefits-chatbot-b2c
AZURE_AD_B2C_CLIENT_ID=$clientId
AZURE_AD_B2C_CLIENT_SECRET=$clientSecret
AZURE_AD_B2C_SIGNUP_SIGNIN_POLICY=B2C_1_signupsignin
AZURE_AD_B2C_RESET_PASSWORD_POLICY=B2C_1_resetpassword
AZURE_AD_B2C_EDIT_PROFILE_POLICY=B2C_1_editprofile

# Azure Core Configuration (will be filled after Azure setup)
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=benefits-chatbot-rg-dev
AZURE_LOCATION=East US

# Azure Cosmos DB Configuration (will be filled after Azure setup)
AZURE_COSMOS_ENDPOINT=your-cosmos-endpoint
AZURE_COSMOS_KEY=your-cosmos-key
AZURE_COSMOS_DATABASE=benefits-chatbot-db
AZURE_COSMOS_CONTAINER_USERS=users
AZURE_COSMOS_CONTAINER_COMPANIES=companies
AZURE_COSMOS_CONTAINER_BENEFITS=benefits
AZURE_COSMOS_CONTAINER_CHATS=chats
AZURE_COSMOS_CONTAINER_DOCUMENTS=documents
AZURE_COSMOS_CONTAINER_FAQS=faqs
AZURE_COSMOS_CONTAINER_DOCUMENT_CHUNKS=document-chunks

# Azure Blob Storage Configuration (will be filled after Azure setup)
AZURE_STORAGE_ACCOUNT_NAME=benefitschatbotdev
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER_DOCUMENTS=documents
AZURE_STORAGE_CONTAINER_IMAGES=images

# Azure Cache for Redis Configuration (will be filled after Azure setup)
AZURE_REDIS_HOST=benefits-chatbot-redis-dev.redis.cache.windows.net
AZURE_REDIS_PORT=6380
AZURE_REDIS_PASSWORD=your-redis-password
AZURE_REDIS_SSL=true
REDIS_URL=rediss://:your-redis-password@benefits-chatbot-redis-dev.redis.cache.windows.net:6380

# Azure OpenAI Service Configuration (will be filled after Azure setup)
AZURE_OPENAI_ENDPOINT=your-openai-endpoint
AZURE_OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Azure Search Configuration (will be filled after Azure setup)
AZURE_SEARCH_ENDPOINT=your-search-endpoint
AZURE_SEARCH_API_KEY=your-search-key
AZURE_SEARCH_INDEX_NAME=benefits-documents

# Azure Functions Configuration (will be filled after Azure setup)
AZURE_FUNCTIONS_ENDPOINT=your-functions-endpoint
AZURE_FUNCTIONS_MASTER_KEY=your-functions-key

# Azure Monitor Configuration (will be filled after Azure setup)
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
AZURE_LOG_ANALYTICS_WORKSPACE_ID=your-workspace-id
AZURE_LOG_ANALYTICS_SHARED_KEY=your-shared-key

# Azure Key Vault Configuration (will be filled after Azure setup)
AZURE_KEY_VAULT_URL=your-keyvault-url
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
"@

# Write to .env.local file
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "✅ Environment file created with Azure AD B2C configuration!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the Azure setup script to create resources" -ForegroundColor White
Write-Host "2. Update the remaining Azure connection strings" -ForegroundColor White
Write-Host "3. Test the application" -ForegroundColor White
