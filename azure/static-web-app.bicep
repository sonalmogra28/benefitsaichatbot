// Azure Static Web Apps (Standard) - $9/month
@description('Azure Static Web Apps for frontend hosting and CDN')
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: 'benefits-chatbot-web-${environment}'
  location: 'Central US'
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/your-org/benefits-chatbot'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: '/api'
      outputLocation: '/out'
      appArtifactLocation: '/out'
    }
    stagingEnvironmentPolicy: {
      allowConfigFileUpdates: true
    }
    allowConfigFileUpdates: true
    provider: 'None'
    enterpriseGradeCdnStatus: 'Enabled'
  }
}

// Custom domain (optional)
resource customDomain 'Microsoft.Web/staticSites/customDomains@2022-03-01' = {
  parent: staticWebApp
  name: 'benefits-chatbot.com'
  properties: {
    domainName: 'benefits-chatbot.com'
    validationToken: 'your-validation-token'
  }
}

// Environment variables for Static Web App
resource appSettings 'Microsoft.Web/staticSites/config@2022-03-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    azureCosmosConnectionString: cosmosDbConnectionString
    azureStorageConnectionString: storageConnectionString
    openaiApiKey: openaiApiKey
    azureCommunicationConnectionString: communicationConnectionString
    azureKeyVaultUrl: keyVaultUrl
    azureApplicationInsightsKey: appInsightsInstrumentationKey
  }
}
