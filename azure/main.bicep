// Main Azure deployment template for Benefits Chatbot
@description('Main deployment template for Benefits Chatbot Azure architecture')
@minLength(1)
@maxLength(64)
@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@minLength(1)
@maxLength(64)
@description('Location for all resources')
param location string = resourceGroup().location

@description('OpenAI API Key')
@secure()
param openaiApiKey string

@description('App Service Principal ID for Key Vault access')
param appServicePrincipalId string

// Variables
var cosmosDbConnectionString = 'AccountEndpoint=https://benefits-chatbot-cosmos-${environment}.documents.azure.com/;AccountKey=${cosmosDbAccount.listKeys().primaryMasterKey};'
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=benefitschatbot${uniqueString(resourceGroup().id)};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
var communicationConnectionString = 'endpoint=https://benefits-chatbot-comm-${environment}.communication.azure.com/;accesskey=${communicationService.listKeys().primaryKey}'
var keyVaultUrl = keyVault.properties.vaultUri

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'benefits-chatbot-vault-${environment}'
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
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'benefits-chatbot-insights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'RedFlag'
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
    retentionInDays: 30
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Deploy all resources
module appService 'app-service.bicep' = {
  name: 'app-service-deployment'
  params: {
    environment: environment
    location: location
    cosmosDbConnectionString: cosmosDbConnectionString
    storageConnectionString: storageConnectionString
    openaiApiKey: openaiApiKey
    communicationConnectionString: communicationConnectionString
  }
}

module cosmosDb 'cosmos-db.bicep' = {
  name: 'cosmos-db-deployment'
  params: {
    environment: environment
    location: location
  }
}

module storage 'storage.bicep' = {
  name: 'storage-deployment'
  params: {
    environment: environment
    location: location
  }
}

module staticWebApp 'static-web-app.bicep' = {
  name: 'static-web-app-deployment'
  params: {
    environment: environment
    cosmosDbConnectionString: cosmosDbConnectionString
    storageConnectionString: storageConnectionString
    openaiApiKey: openaiApiKey
    communicationConnectionString: communicationConnectionString
    keyVaultUrl: keyVaultUrl
    appInsightsInstrumentationKey: appInsights.properties.InstrumentationKey
  }
}

module communicationServices 'communication-services.bicep' = {
  name: 'communication-services-deployment'
  params: {
    environment: environment
  }
}

module monitoring 'monitoring.bicep' = {
  name: 'monitoring-deployment'
  params: {
    environment: environment
    location: location
    cosmosDbConnectionString: cosmosDbConnectionString
    storageConnectionString: storageConnectionString
    openaiApiKey: openaiApiKey
    appServicePrincipalId: appServicePrincipalId
  }
}

// Outputs
output appServiceUrl string = appService.outputs.appServiceUrl
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output cosmosDbEndpoint string = cosmosDb.outputs.cosmosDbEndpoint
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultUrl string = keyVaultUrl
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
