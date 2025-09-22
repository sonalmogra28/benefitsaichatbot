// Azure Application Insights - $30-80/month
@description('Azure Application Insights for monitoring and compliance logging')
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'benefits-chatbot-insights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    IngestionMode: 'ApplicationInsights'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'benefits-chatbot-logs-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: 1
    }
  }
}

// Azure Cache for Redis (Basic) - $16/month
@description('Azure Cache for Redis for session management and caching')
resource redisCache 'Microsoft.Cache/redis@2023-04-01' = {
  name: 'benefits-chatbot-redis-${environment}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// Azure Key Vault - $3-10/month
@description('Azure Key Vault for secrets management')
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'benefits-chatbot-kv-${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: appServicePrincipalId
        permissions: {
          keys: ['get', 'list']
          secrets: ['get', 'list']
          certificates: ['get', 'list']
        }
      }
    ]
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: false
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Store secrets in Key Vault
resource cosmosDbSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'cosmos-db-connection-string'
  properties: {
    value: cosmosDbConnectionString
    contentType: 'text/plain'
  }
}

resource storageSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: storageConnectionString
    contentType: 'text/plain'
  }
}

resource openaiSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'openai-api-key'
  properties: {
    value: openaiApiKey
    contentType: 'text/plain'
  }
}
