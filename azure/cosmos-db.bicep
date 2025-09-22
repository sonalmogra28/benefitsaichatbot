// Azure Cosmos DB Serverless - $50-150/month
@description('Azure Cosmos DB Serverless for cost-effective database')
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'benefits-chatbot-cosmos-${environment}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    isVirtualNetworkFilterEnabled: false
    virtualNetworkRules: []
    ipRules: []
    enableFreeTier: false
    enableAnalyticalStorage: false
    analyticalStorageConfiguration: {
      schemaType: 'WellDefined'
    }
    createMode: 'Default'
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Geo'
      }
    }
    networkAclBypass: 'None'
    networkAclBypassResourceIds: []
    disableKeyBasedMetadataWriteAccess: false
    enablePartitionKeyMonitor: false
  }
}

// Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: 'benefits-db'
  properties: {
    resource: {
      id: 'benefits-db'
    }
  }
}

// Containers
resource chatMessagesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'chat-messages'
  properties: {
    resource: {
      id: 'chat-messages'
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      defaultTtl: -1
      uniqueKeyPolicy: {
        uniqueKeys: []
      }
      conflictResolutionPolicy: {
        mode: 'LastWriterWins'
        conflictResolutionPath: '/_ts'
      }
    }
  }
}

resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource companiesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'companies'
  properties: {
    resource: {
      id: 'companies'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource notificationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'notifications'
  properties: {
    resource: {
      id: 'notifications'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}
