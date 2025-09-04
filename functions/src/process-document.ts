import * as functions from 'firebase-functions';
import { adminDb, adminStorage } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import { generateEmbeddings } from '../../lib/ai/embeddings';
import { vectorSearchService } from '../../lib/ai/vector-search';
// The Cloud Storage bucket to process documents from. This must be set via
// environment variable so the function doesn't accidentally process files from
// unintended buckets.
const BUCKET_NAME = process.env.GCLOUD_STORAGE_BUCKET;


async function getTextFromPdf(fileBuffer: Buffer): Promise<string> {
  const data = await pdf(fileBuffer);
  return data.text;
}

async function getTextFromDocx(fileBuffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
  return value;
}

export const processDocumentOnUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const { bucket, name: filePath, contentType } = object;

    if (!filePath || !contentType) {
      console.error('File path or content type is missing.');
      return;
    }

    if (!bucket) {
      console.error('Storage event missing bucket information.');
      return;
    }

    if (!BUCKET_NAME) {
      console.error('GCLOUD_STORAGE_BUCKET environment variable is not set.');
      return;
    }

    // Only process events from the configured bucket to avoid unintended work.
    if (bucket !== BUCKET_NAME) {
      console.log(
        `File from bucket ${bucket} ignored; expecting ${BUCKET_NAME}.`,
      );
      return;
    }

    // For this project, we only care about documents in the 'documents' folder
    if (!filePath.startsWith('documents/')) {
      console.log(`File ${filePath} is not in a 'documents' folder, skipping.`);
      return;
    }

    // Find the corresponding document in Firestore
    const documentsRef = adminDb.collection('documents');
    const snapshot = await documentsRef
      .where('storagePath', '==', filePath)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error(
        `No Firestore document found for storage path: ${filePath}`,
      );
      return;
    }

    const documentRef = snapshot.docs[0].ref;
    const documentId = documentRef.id;


    try {
      console.log(`Processing document ${documentId} for file: ${filePath}`);
      await documentRef.update({
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Read the file from the configured bucket.
      const fileBuffer = await adminStorage
        .bucket(BUCKET_NAME)
        .file(filePath)
        .download();
      let content = '';

      if (contentType === 'application/pdf') {
        content = await getTextFromPdf(fileBuffer[0]);
      } else if (
        contentType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        content = await getTextFromDocx(fileBuffer[0]);
      } else {
        console.warn(`Unsupported content type: ${contentType}. Skipping.`);
        await documentRef.update({
          status: 'failed',
          error: 'Unsupported file type',
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        throw new Error('No content extracted from the document.');
      }

      // Simple chunking strategy
      const chunks = content.match(/.{1,1500}/gs) || [];
      const chunksCollectionRef = documentRef.collection('content_chunks');
      const batch = adminDb.batch();

      chunks.forEach((chunk, index) => {
        const chunkRef = chunksCollectionRef.doc(`chunk_${index}`);
        batch.set(chunkRef, {

          content: chunk,
          chunkNumber: index + 1,
          charCount: chunk.length,
        });
      });
      await batch.commit();


      await documentRef.update({
        status: 'processed',
        chunkCount: chunks.length,
        totalCharCount: content.length,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `[SUCCESS] Stored ${chunks.length} chunks for document ${documentId}`,
      );
    } catch (error) {
      console.error(`[FAIL] Could not process document ${documentId}:`, error);
      await documentRef
        .update({
          status: 'failed',
          error: (error as Error).message,
          updatedAt: FieldValue.serverTimestamp(),
        })
        .catch((err) =>
          console.error(`Failed to update document status to "failed":`, err),
        );
    }
  });
