import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testPinecone() {
  console.log('🔍 Testing Pinecone connection...');
  
  // Check if API key exists
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    console.log('Please add PINECONE_API_KEY to your .env.local file');
    process.exit(1);
  }

  try {
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('✅ Pinecone client initialized');
    
    // List indexes to verify connection
    const indexes = await pinecone.listIndexes();
    console.log('📊 Available indexes:', indexes);
    
    // Check if benefits-ai index exists
    const indexName = process.env.PINECONE_INDEX_NAME || 'benefits-ai';
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);
    
    if (!indexExists) {
      console.log(`⚠️  Index '${indexName}' does not exist`);
      console.log('Creating index...');
      
      // Create index with appropriate configuration
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI embeddings dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log(`✅ Index '${indexName}' created successfully`);
    } else {
      console.log(`✅ Index '${indexName}' exists`);
    }
    
    // Connect to index and get stats
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();
    console.log('📈 Index statistics:', stats);
    
    // Test namespace creation
    const testNamespace = 'test-company-123';
    const ns = index.namespace(testNamespace);
    console.log(`✅ Namespace '${testNamespace}' ready for use`);
    
    console.log('\n🎉 Pinecone connection test successful!');
    console.log('Ready to store and query document embeddings.');
    
  } catch (error) {
    console.error('❌ Pinecone test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPinecone();