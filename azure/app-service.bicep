// Azure App Service (Basic B1) - $55/month
@description('Azure App Service for web hosting and auto-scaling')
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: 'benefits-chatbot-${environment}'
  location: location
  kind: 'app'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '18.18.0'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'AZURE_COSMOS_CONNECTION_STRING'
          value: cosmosDbConnectionString
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: storageConnectionString
        }
        {
          name: 'OPENAI_API_KEY'
          value: openaiApiKey
        }
        {
          name: 'AZURE_COMMUNICATION_CONNECTION_STRING'
          value: communicationConnectionString
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${staticWebAppHostname}'
        ]
      }
    }
    httpsOnly: true
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'benefits-chatbot-plan-${environment}'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}
