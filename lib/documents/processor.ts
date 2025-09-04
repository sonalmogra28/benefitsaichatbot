import { extractText } from 'unpdf';
import { adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase/admin';
import {
  upsertDocumentChunks,
} from '@/lib/ai/vector-search';

/**
 * Process a document: extract text, chunk it, generate embeddings, and store in Vertex AI Vector Search
 */
export async function processDocument(documentId: string) {
  try {
    // Fetch document from Firestore
    const docRef = await adminDb.collection('documents').doc(documentId).get();
    
    if (!docRef.exists) {
      throw new Error('Document not found');
    }

    const document = { id: docRef.id, ...docRef.data() } as any;

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
    await adminDb.collection('documents').doc(documentId).update({
      content: extractedText,
      processedAt: AdminFieldValue.serverTimestamp(),
      status: 'processing',
    });

    // Chunk the text
    const chunks = chunkText(extractedText, {
      maxChunkSize: 1000,
      overlapSize: 200,
    });

    const documentChunks = chunks.map((chunk, i) => ({
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
    }));

    // Store in Vertex AI
    const vectorsUpserted = await upsertDocumentChunks(
      document.companyId,
      documentChunks,
    );

    // Update document status to processed
    await adminDb.collection('documents').doc(documentId).update({
      status: 'processed',
      processedAt: AdminFieldValue.serverTimestamp(),
      chunksCount: chunks.length,
    });

    // TODO: Implement document processing notifications
    // Send success notification if the document has an associated user
    // if (document.createdBy) {
    //   await notificationService.sendDocumentProcessedNotification({
    //     userId: document.createdBy,
    //     documentName: document.title,
    //     status: 'processed',
    //   });
    // }

    return {
      success: true,
      chunksProcessed: chunks.length,
      vectorsStored: vectorsUpserted,
    };
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);

    // Update document with error status
    try {
      await adminDb.collection('documents').doc(documentId).update({
        status: 'failed',
        processedAt: AdminFieldValue.serverTimestamp(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

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
 * Process all pending documents for a company
 */
export async function processCompanyDocuments(companyId: string) {
  // Query pending documents for the company
  const snapshot = await adminDb
    .collection('documents')
    .where('companyId', '==', companyId)
    .where('status', 'in', ['pending', 'uploaded', 'failed'])
    .get();

  const pendingDocuments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

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