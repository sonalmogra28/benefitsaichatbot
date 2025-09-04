import { config } from 'dotenv';
import path from 'node:path';

// Load environment variables BEFORE any other imports
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import { knowledgeBaseDocuments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { IndexEndpointServiceClient } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing Pipeline with Vertex AI');
  console.log('======================================================\n');

  try {
    // Test 1: Check Vertex AI connection
    console.log('1️⃣ Testing Vertex AI Connection...');
    const project = process.env.GOOGLE_CLOUD_PROJECT || '';
    const location = 'us-central1';
    const indexEndpointId = process.env.VERTEX_AI_INDEX_ENDPOINT_ID || '';

    if (!project || !indexEndpointId) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT and VERTEX_AI_INDEX_ENDPOINT_ID must be set in .env.local',
      );
    }

    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const client = new IndexEndpointServiceClient({
      auth,
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    });
    const endpointName = `projects/${project}/locations/${location}/indexEndpoints/${indexEndpointId}`;

    const [endpoint] = await client.getIndexEndpoint({ name: endpointName });
    console.log('✅ Vertex AI connected successfully');
    console.log(`   Endpoint: ${endpoint.displayName}\n`);

    // Test 2: Test text chunking
    console.log('2️⃣ Testing Text Chunking...');
    const testText = `This is a test document for the benefits platform. It contains information about health insurance plans.
    
    Section 1: Medical Coverage
    Our medical plan covers doctor visits, hospital stays, and prescription medications. The annual deductible is $1,000 for individuals and $2,000 for families.
    
    Section 2: Dental Coverage
    Dental benefits include preventive care, basic procedures, and major procedures. Preventive care is covered at 100% with no deductible.
    
    Section 3: Vision Coverage
    Vision benefits include annual eye exams and allowances for glasses or contact lenses. The plan provides $150 annually for frames.`;

    const { chunkText } = await import('../lib/documents/processor');
    const chunks = chunkText(testText, { maxChunkSize: 200, overlapSize: 50 });
    console.log(
      `✅ Text chunked successfully: ${chunks.length} chunks created`,
    );
    console.log(`   Sample chunk: "${chunks[0].substring(0, 100)}..."\n`);

    // Test 3: Create a test document in the database
    console.log('3️⃣ Creating Test Document in Database...');
    const testDocumentData = {
      companyId: 'test-company-001',
      title: 'Test Benefits Guide',
      content: testText,
      documentType: 'guide' as const,
      category: 'benefits',
      tags: ['test', 'benefits', 'health'],
      fileUrl: 'https://example.com/test-doc.pdf', // Dummy URL for testing
      fileType: 'text/plain',
      createdBy: 'test-user-001',
      isPublic: false,
    };

    const [testDocument] = await db
      .insert(knowledgeBaseDocuments)
      .values(testDocumentData)
      .returning();
    console.log(`✅ Test document created with ID: ${testDocument.id}\n`);

    // Test 4: Process the document and upsert to Vertex AI
    console.log('4️⃣ Testing Document Processing and Upserting to Vertex AI...');
    const documentChunks = chunks.slice(0, 3).map((chunk, i) => ({
      id: `${testDocument.id}-chunk-${i}`,
      text: chunk,
      metadata: {
        documentId: testDocument.id,
        companyId: testDocument.companyId,
        documentTitle: testDocument.title,
        chunkIndex: i,
        category: testDocument.category || undefined,
        tags: (testDocument.tags as string[]) || [],
      },
    }));

    const { status, vectorsUpserted } = await upsertDocumentChunks(
      testDocument.companyId,
      documentChunks,
    );

    console.log(`✅ Document processed and upserted successfully`);
    console.log(`   Status: ${status}`);
    console.log(`   Vectors stored: ${vectorsUpserted}\n`);

    // Cleanup
    console.log('5️⃣ Cleaning up test data...');
    await db
      .delete(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, testDocument.id));
    // Note: Vertex AI vectors will remain. Deletion by ID is more complex and not tested here.
    console.log('✅ Test document deleted from database\n');

    console.log('🎉 All tests passed successfully!');
    console.log(
      'The document processing pipeline with Vertex AI is working correctly.',
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDocumentProcessing()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
