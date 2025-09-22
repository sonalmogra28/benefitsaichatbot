// Azure Blob Storage (Hot tier) - $20-40/month
@description('Azure Blob Storage for document storage and CDN')
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'benefitschatbot${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Standard_LRS'
    tier: 'Standard'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    allowSharedKeyAccess: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

// Blob containers
resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: storageAccount
  name: 'documents'
  properties: {
    publicAccess: 'None'
    metadata: {
      description: 'Document storage for benefits chatbot'
    }
  }
}

resource imagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: storageAccount
  name: 'images'
  properties: {
    publicAccess: 'None'
    metadata: {
      description: 'Image storage for benefits chatbot'
    }
  }
}

// CDN Profile
resource cdnProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'benefits-chatbot-cdn-${environment}'
  location: 'global'
  sku: {
    name: 'Standard_Microsoft'
  }
  properties: {
    originHostHeader: storageAccount.properties.primaryEndpoints.blob
  }
}

resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2023-05-01' = {
  parent: cdnProfile
  name: 'benefits-chatbot-cdn-endpoint'
  location: 'global'
  properties: {
    originHostHeader: storageAccount.properties.primaryEndpoints.blob
    origins: [
      {
        name: 'storage-origin'
        hostName: storageAccount.properties.primaryEndpoints.blob
        httpsPort: 443
        originHostHeader: storageAccount.properties.primaryEndpoints.blob
      }
    ]
    isHttpAllowed: false
    isHttpsAllowed: true
    queryStringCachingBehavior: 'IgnoreQueryString'
    contentTypesToCompress: [
      'application/json'
      'text/plain'
      'text/css'
      'text/javascript'
      'application/javascript'
    ]
    isCompressionEnabled: true
  }
}
