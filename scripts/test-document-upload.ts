import { config } from 'dotenv';
import path from 'node:path';

// Load environment variables BEFORE any other imports
config({ path: path.resolve(process.cwd(), '.env.local') });
import { db } from '../lib/db';
import { knowledgeBaseDocuments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyNamespace } from '../lib/vectors/pinecone';

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing Pipeline');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check Pinecone connection
    console.log('1️⃣ Testing Pinecone Connection...');
    const companyId = 'test-company-001';
    const namespace = getCompanyNamespace(companyId);
    const stats = await namespace.describeIndexStats();
    console.log('✅ Pinecone connected successfully');
    console.log(`   Current vectors in test namespace: ${stats.recordCount || 0}\n`);
    
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
    console.log(`✅ Text chunked successfully: ${chunks.length} chunks created`);
    console.log(`   Sample chunk: "${chunks[0].substring(0, 100)}..."\n`);
    
    // Test 3: Test embedding generation
    console.log('3️⃣ Testing Embedding Generation...');
    const { generateEmbedding } = await import('../lib/ai/embeddings');
    const embedding = await generateEmbedding('This is a test sentence for embedding generation.');
    console.log(`✅ Embedding generated successfully`);
    console.log(`   Embedding dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
    
    // Test 4: Create a test document in the database
    console.log('4️⃣ Creating Test Document in Database...');
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
    
    const [testDocument] = await db.insert(knowledgeBaseDocuments).values(testDocumentData).returning();
    console.log(`✅ Test document created with ID: ${testDocument.id}\n`);
    
    // Test 5: Process the document (without actual file download)
    console.log('5️⃣ Testing Document Processing (Simulated)...');
    // Update the document with content directly to avoid file download
    await db
      .update(knowledgeBaseDocuments)
      .set({ content: testText })
      .where(eq(knowledgeBaseDocuments.id, testDocument.id));
    
    console.log('   Processing chunks and generating embeddings...');
    const { upsertDocumentChunks } = await import('../lib/vectors/pinecone');
    
    // Generate chunks with embeddings
    const chunksWithEmbeddings = await Promise.all(
      chunks.slice(0, 3).map(async (chunk, i) => ({
        id: `${testDocument.id}-chunk-${i}`,
        text: chunk,
        metadata: {
          documentId: testDocument.id,
          companyId: testDocument.companyId,
          documentTitle: testDocument.title,
          chunkIndex: i,
          category: testDocument.category || undefined,
          tags: testDocument.tags as string[] || [],
        },
        embedding: await generateEmbedding(chunk),
      }))
    );
    
    const vectorsUpserted = await upsertDocumentChunks(
      testDocument.companyId,
      chunksWithEmbeddings
    );
    
    console.log(`✅ Document processed successfully`);
    console.log(`   Vectors stored: ${vectorsUpserted}\n`);
    
    // Cleanup
    console.log('6️⃣ Cleaning up test data...');
    await db.delete(knowledgeBaseDocuments).where(eq(knowledgeBaseDocuments.id, testDocument.id));
    // Note: Pinecone vectors will remain for manual cleanup if needed
    console.log('✅ Test document deleted from database\n');
    
    console.log('🎉 All tests passed successfully!');
    console.log('The document processing pipeline is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDocumentProcessing().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});