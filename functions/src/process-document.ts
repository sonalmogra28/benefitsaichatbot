import * as functions from 'firebase-functions/v1';
import { adminDb, adminStorage } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';


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

  .onFinalize(async (object: functions.storage.ObjectMetadata) => {
    const { bucket, name: filePath, contentType } = object;

  if (!filePath || !contentType) {
    functions.logger.warn('File path or content type is missing', { object });
    return;
  }

  // For this project, we only care about documents in the 'documents' folder
  if (!filePath.startsWith('documents/')) {
    functions.logger.info('File not in documents folder, skipping', { filePath });
    return;
  }

  // Find the corresponding document in Firestore
  const documentsRef = adminDb.collection('documents');
  const snapshot = await documentsRef.where('storagePath', '==', filePath).limit(1).get();

  if (snapshot.empty) {
    functions.logger.error('No Firestore document found for storage path', { filePath });
    return;
  }
  const documentRef = snapshot.docs[0].ref;
  const documentId = documentRef.id;

  try {
    functions.logger.info('Processing document', { documentId, filePath });
    await documentRef.update({ status: 'processing', updatedAt: FieldValue.serverTimestamp() });

    const fileBuffer = await adminStorage.bucket(bucket).file(filePath).download();
    let content = '';

    if (contentType === 'application/pdf') {
      content = await getTextFromPdf(fileBuffer[0]);
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      content = await getTextFromDocx(fileBuffer[0]);
    } else {
      functions.logger.warn('Unsupported content type', { contentType });
      await documentRef.update({ status: 'failed', error: 'Unsupported file type', updatedAt: FieldValue.serverTimestamp() });

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
    });
    await batch.commit();

    await documentRef.update({
      status: 'processed',
      chunkCount: chunks.length,
      totalCharCount: content.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    functions.logger.info('Stored document chunks', { documentId, chunkCount: chunks.length });
  } catch (error) {
    functions.logger.error('Could not process document', { documentId, error });
    await documentRef
      .update({
        status: 'failed',
        error: (error as Error).message,
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch((err) => functions.logger.error('Failed to update document status to failed', { documentId, error: err }));
  }
  });
