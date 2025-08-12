import { extractText } from 'unpdf';
import { generateEmbedding as generateOpenAIEmbedding } from '@/lib/ai/embeddings';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  upsertDocumentChunks,
  type DocumentChunk,
} from '@/lib/vectors/pinecone';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Process a document: extract text, chunk it, generate embeddings, and store in Pinecone
 */
export async function processDocument(documentId: string) {
  try {
    // Fetch document from database
    const [document] = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, documentId))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.fileUrl) {
      throw new Error('Document has no file URL');
    }

    // Download file from blob storage
    const response = await fetch(document.fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const fileBuffer = await response.arrayBuffer();

    // Extract text based on file type
    let extractedText = '';

    if (document.fileType === 'application/pdf') {
      const { text } = await extractText(fileBuffer);
      extractedText = Array.isArray(text) ? text.join('\n') : text;
    } else if (document.fileType === 'text/plain') {
      extractedText = new TextDecoder().decode(fileBuffer);
    } else {
      // For now, we'll skip other file types
      throw new Error(`Unsupported file type: ${document.fileType}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    // Update document content in database
    await db
      .update(knowledgeBaseDocuments)
      .set({
        content: extractedText,
        processedAt: new Date(),
      })
      .where(eq(knowledgeBaseDocuments.id, documentId));

    // Chunk the text
    const chunks = chunkText(extractedText, {
      maxChunkSize: 1000,
      overlapSize: 200,
    });

    // Generate embeddings for each chunk
    const chunksWithEmbeddings: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      chunksWithEmbeddings.push({
        id: `${documentId}-chunk-${i}`,
        text: chunk,
        metadata: {
          documentId,
          companyId: document.companyId,
          documentTitle: document.title,
          chunkIndex: i,
          category: document.category || undefined,
          tags: (document.tags as string[]) || [],
        },
        embedding,
      });
    }

    // Store in Pinecone
    const vectorsUpserted = await upsertDocumentChunks(
      document.companyId,
      chunksWithEmbeddings,
    );

    // Update document status to processed
    await db
      .update(knowledgeBaseDocuments)
      .set({
        processedAt: new Date(),
      })
      .where(eq(knowledgeBaseDocuments.id, documentId));

    // Send success notification if the document has an associated user
    if (document.createdBy) {
      await notificationService.sendDocumentProcessedNotification({
        userId: document.createdBy,
        documentName: document.title,
        status: 'processed',
      });
    }

    return {
      success: true,
      chunksProcessed: chunks.length,
      vectorsStored: vectorsUpserted,
    };
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);

    // Update document with error status
    await db
      .update(knowledgeBaseDocuments)
      .set({
        processedAt: new Date(),
        // You might want to add an error field to the schema
      })
      .where(eq(knowledgeBaseDocuments.id, documentId));

    // Note: Cannot send notification here as document may not be available
    // TODO: Implement proper error handling with notification

    throw error;
  }
}

/**
 * Chunk text into smaller pieces with overlap
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize: number;
    overlapSize: number;
  },
): string[] {
  const { maxChunkSize, overlapSize } = options;
  const chunks: string[] = [];

  // Clean up the text
  const cleanText = text
    .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Split into sentences (simple approach)
  const sentences = cleanText.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let currentSize = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.length;

    if (currentSize + sentenceSize > maxChunkSize && currentChunk) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap
      const overlap = currentChunk
        .split(' ')
        .slice(-Math.floor(overlapSize / 10)) // Approximate word count for overlap
        .join(' ');

      currentChunk = `${overlap} ${sentence}`;
      currentSize = currentChunk.length;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentSize += sentenceSize;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate embedding for a text chunk using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateOpenAIEmbedding(text);
}

/**
 * Process all pending documents for a company
 */
export async function processCompanyDocuments(companyId: string) {
  const pendingDocuments = await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.companyId, companyId));

  const results = [];

  for (const doc of pendingDocuments) {
    try {
      const result = await processDocument(doc.id);
      results.push({ documentId: doc.id, ...result });
    } catch (error) {
      results.push({
        documentId: doc.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
