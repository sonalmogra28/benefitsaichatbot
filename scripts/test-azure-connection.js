// Azure Connection Test Script
// Run with: node scripts/test-azure-connection.js

const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');
const { createClient } = require('redis');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testAzureConnections() {
  console.log('🔍 Testing Azure connections...\n');

  // Test Cosmos DB
  try {
    console.log('📊 Testing Cosmos DB connection...');
    const cosmosClient = new CosmosClient({
      endpoint: process.env.AZURE_COSMOS_ENDPOINT,
      key: process.env.AZURE_COSMOS_KEY,
    });
    
    const { database } = await cosmosClient.databases.createIfNotExists({
      id: process.env.AZURE_COSMOS_DATABASE,
    });
    
    console.log('✅ Cosmos DB connection successful');
    console.log(`   Database: ${database.id}`);
  } catch (error) {
    console.log('❌ Cosmos DB connection failed:', error.message);
  }

  // Test Storage Account
  try {
    console.log('\n💾 Testing Storage Account connection...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    
    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER_DOCUMENTS
    );
    
    await containerClient.createIfNotExists();
    console.log('✅ Storage Account connection successful');
    console.log(`   Container: ${containerClient.containerName}`);
  } catch (error) {
    console.log('❌ Storage Account connection failed:', error.message);
  }

  // Test Redis Cache
  try {
    console.log('\n🔴 Testing Redis Cache connection...');
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    
    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis Cache connection successful');
    
    await redisClient.disconnect();
  } catch (error) {
    console.log('❌ Redis Cache connection failed:', error.message);
  }

  // Test Application Insights
  try {
    console.log('\n📈 Testing Application Insights connection...');
    const connectionString = process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING;
    
    if (connectionString && connectionString.includes('InstrumentationKey=')) {
      console.log('✅ Application Insights connection string is valid');
    } else {
      console.log('❌ Application Insights connection string is invalid');
    }
  } catch (error) {
    console.log('❌ Application Insights connection failed:', error.message);
  }

  console.log('\n🎉 Azure connection test completed!');
}

// Run the test
testAzureConnections().catch(console.error);
