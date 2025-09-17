import { z } from 'zod';

// Azure configuration schema
const azureConfigSchema = z.object({
  // Azure Core
  tenantId: z.string().min(1, 'Azure tenant ID is required'),
  clientId: z.string().min(1, 'Azure client ID is required'),
  clientSecret: z.string().min(1, 'Azure client secret is required'),
  subscriptionId: z.string().min(1, 'Azure subscription ID is required'),
  resourceGroup: z.string().min(1, 'Azure resource group is required'),
  location: z.string().min(1, 'Azure location is required'),

  // Azure AD B2C
  adB2CTenantName: z.string().min(1, 'Azure AD B2C tenant name is required'),
  adB2CClientId: z.string().min(1, 'Azure AD B2C client ID is required'),
  adB2CClientSecret: z.string().min(1, 'Azure AD B2C client secret is required'),
  adB2CSignupSigninPolicy: z.string().min(1, 'Azure AD B2C signup/signin policy is required'),
  adB2CResetPasswordPolicy: z.string().min(1, 'Azure AD B2C reset password policy is required'),
  adB2CEditProfilePolicy: z.string().min(1, 'Azure AD B2C edit profile policy is required'),

  // Azure Cosmos DB
  cosmosEndpoint: z.string().url('Invalid Cosmos DB endpoint URL'),
  cosmosKey: z.string().min(1, 'Cosmos DB key is required'),
  cosmosDatabase: z.string().min(1, 'Cosmos DB database name is required'),
  cosmosContainerUsers: z.string().min(1, 'Cosmos DB users container name is required'),
  cosmosContainerCompanies: z.string().min(1, 'Cosmos DB companies container name is required'),
  cosmosContainerBenefits: z.string().min(1, 'Cosmos DB benefits container name is required'),
  cosmosContainerChats: z.string().min(1, 'Cosmos DB chats container name is required'),
  cosmosContainerDocuments: z.string().min(1, 'Cosmos DB documents container name is required'),

  // Azure Blob Storage
  storageAccountName: z.string().min(1, 'Storage account name is required'),
  storageAccountKey: z.string().min(1, 'Storage account key is required'),
  storageConnectionString: z.string().min(1, 'Storage connection string is required'),
  storageContainerDocuments: z.string().min(1, 'Documents container name is required'),
  storageContainerImages: z.string().min(1, 'Images container name is required'),

  // Azure Cache for Redis
  redisHost: z.string().min(1, 'Redis host is required'),
  redisPort: z.number().min(1).max(65535, 'Invalid Redis port'),
  redisPassword: z.string().min(1, 'Redis password is required'),
  redisSsl: z.boolean().default(true),
  redisUrl: z.string().url('Invalid Redis URL'),

  // Azure OpenAI Service
  openaiEndpoint: z.string().url('Invalid OpenAI endpoint URL'),
  openaiApiKey: z.string().min(1, 'OpenAI API key is required'),
  openaiApiVersion: z.string().min(1, 'OpenAI API version is required'),
  openaiDeploymentName: z.string().min(1, 'OpenAI deployment name is required'),
  openaiEmbeddingDeployment: z.string().min(1, 'OpenAI embedding deployment name is required'),

  // Azure Search
  searchEndpoint: z.string().url('Invalid search endpoint URL'),
  searchApiKey: z.string().min(1, 'Search API key is required'),
  searchIndexName: z.string().min(1, 'Search index name is required'),

  // Azure Functions
  functionsEndpoint: z.string().url('Invalid functions endpoint URL'),
  functionsMasterKey: z.string().min(1, 'Functions master key is required'),

  // Azure Monitor
  applicationInsightsConnectionString: z.string().min(1, 'Application Insights connection string is required'),
  logAnalyticsWorkspaceId: z.string().min(1, 'Log Analytics workspace ID is required'),
  logAnalyticsSharedKey: z.string().min(1, 'Log Analytics shared key is required'),

  // Azure Key Vault
  keyVaultUrl: z.string().url('Invalid Key Vault URL'),
  keyVaultClientId: z.string().min(1, 'Key Vault client ID is required'),
  keyVaultClientSecret: z.string().min(1, 'Key Vault client secret is required'),

  // Application
  appUrl: z.string().url('Invalid app URL'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Security
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  encryptionKey: z.string().length(32, 'Encryption key must be exactly 32 characters'),

  // Rate Limiting
  rateLimitRedisUrl: z.string().url('Invalid rate limit Redis URL'),

  // File Upload
  maxFileSize: z.number().positive('Max file size must be positive'),
  allowedFileTypes: z.string().min(1, 'Allowed file types must be specified'),

  // Email
  resendApiKey: z.string().min(1, 'Resend API key is required'),

  // Development
  useEmulator: z.boolean().default(false),
  debugMode: z.boolean().default(false),
});

// Parse and validate environment variables
const parseAzureConfig = () => {
  const rawConfig = {
    // Azure Core
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,
    location: process.env.AZURE_LOCATION,

    // Azure AD B2C
    adB2CTenantName: process.env.AZURE_AD_B2C_TENANT_NAME,
    adB2CClientId: process.env.AZURE_AD_B2C_CLIENT_ID,
    adB2CClientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
    adB2CSignupSigninPolicy: process.env.AZURE_AD_B2C_SIGNUP_SIGNIN_POLICY,
    adB2CResetPasswordPolicy: process.env.AZURE_AD_B2C_RESET_PASSWORD_POLICY,
    adB2CEditProfilePolicy: process.env.AZURE_AD_B2C_EDIT_PROFILE_POLICY,

    // Azure Cosmos DB
    cosmosEndpoint: process.env.AZURE_COSMOS_ENDPOINT,
    cosmosKey: process.env.AZURE_COSMOS_KEY,
    cosmosDatabase: process.env.AZURE_COSMOS_DATABASE,
    cosmosContainerUsers: process.env.AZURE_COSMOS_CONTAINER_USERS,
    cosmosContainerCompanies: process.env.AZURE_COSMOS_CONTAINER_COMPANIES,
    cosmosContainerBenefits: process.env.AZURE_COSMOS_CONTAINER_BENEFITS,
    cosmosContainerChats: process.env.AZURE_COSMOS_CONTAINER_CHATS,
    cosmosContainerDocuments: process.env.AZURE_COSMOS_CONTAINER_DOCUMENTS,

    // Azure Blob Storage
    storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    storageContainerDocuments: process.env.AZURE_STORAGE_CONTAINER_DOCUMENTS,
    storageContainerImages: process.env.AZURE_STORAGE_CONTAINER_IMAGES,

    // Azure Cache for Redis
    redisHost: process.env.AZURE_REDIS_HOST,
    redisPort: process.env.AZURE_REDIS_PORT ? parseInt(process.env.AZURE_REDIS_PORT, 10) : 6380,
    redisPassword: process.env.AZURE_REDIS_PASSWORD,
    redisSsl: process.env.AZURE_REDIS_SSL === 'true',
    redisUrl: process.env.REDIS_URL,

    // Azure OpenAI Service
    openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    openaiApiKey: process.env.AZURE_OPENAI_API_KEY,
    openaiApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    openaiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    openaiEmbeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,

    // Azure Search
    searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT,
    searchApiKey: process.env.AZURE_SEARCH_API_KEY,
    searchIndexName: process.env.AZURE_SEARCH_INDEX_NAME,

    // Azure Functions
    functionsEndpoint: process.env.AZURE_FUNCTIONS_ENDPOINT,
    functionsMasterKey: process.env.AZURE_FUNCTIONS_MASTER_KEY,

    // Azure Monitor
    applicationInsightsConnectionString: process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING,
    logAnalyticsWorkspaceId: process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
    logAnalyticsSharedKey: process.env.AZURE_LOG_ANALYTICS_SHARED_KEY,

    // Azure Key Vault
    keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
    keyVaultClientId: process.env.AZURE_KEY_VAULT_CLIENT_ID,
    keyVaultClientSecret: process.env.AZURE_KEY_VAULT_CLIENT_SECRET,

    // Application
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
    logLevel: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',

    // Security
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,

    // Rate Limiting
    rateLimitRedisUrl: process.env.RATE_LIMIT_REDIS_URL,

    // File Upload
    maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : 10485760,
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt',

    // Email
    resendApiKey: process.env.RESEND_API_KEY,

    // Development
    useEmulator: process.env.AZURE_USE_EMULATOR === 'true',
    debugMode: process.env.AZURE_DEBUG_MODE === 'true',
  };

  try {
    return azureConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Azure configuration validation failed:\n${missingFields.join('\n')}`);
    }
    throw error;
  }
};

export const azureConfig = parseAzureConfig();
export type AzureConfig = z.infer<typeof azureConfigSchema>;

// Helper functions for common configurations
export const getCosmosDbConfig = () => ({
  endpoint: azureConfig.cosmosEndpoint,
  key: azureConfig.cosmosKey,
  databaseId: azureConfig.cosmosDatabase,
});

export const getBlobStorageConfig = () => ({
  connectionString: azureConfig.storageConnectionString,
  accountName: azureConfig.storageAccountName,
  accountKey: azureConfig.storageAccountKey,
});

export const getRedisConfig = () => ({
  host: azureConfig.redisHost,
  port: azureConfig.redisPort,
  password: azureConfig.redisPassword,
  tls: azureConfig.redisSsl ? {} : undefined,
});

export const getOpenAIConfig = () => ({
  endpoint: azureConfig.openaiEndpoint,
  apiKey: azureConfig.openaiApiKey,
  apiVersion: azureConfig.openaiApiVersion,
  deploymentName: azureConfig.openaiDeploymentName,
  embeddingDeployment: azureConfig.openaiEmbeddingDeployment,
});

export const getSearchConfig = () => ({
  endpoint: azureConfig.searchEndpoint,
  apiKey: azureConfig.searchApiKey,
  indexName: azureConfig.searchIndexName,
});

export const getAdB2CConfig = () => ({
  tenantName: azureConfig.adB2CTenantName,
  clientId: azureConfig.adB2CClientId,
  clientSecret: azureConfig.adB2CClientSecret,
  signupSigninPolicy: azureConfig.adB2CSignupSigninPolicy,
  resetPasswordPolicy: azureConfig.adB2CResetPasswordPolicy,
  editProfilePolicy: azureConfig.adB2CEditProfilePolicy,
});
