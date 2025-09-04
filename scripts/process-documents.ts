
import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const program = new Command();

program
  .name('process-documents')
  .description('Process and upload benefit documents to Firestore')
  .option('-d, --directory <path>', 'Directory containing documents', './data/benefits-documents')
  .option('-c, --companyId <id>', 'Company ID for the documents', 'amerivet');

async function getTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function getTextFromDocx(filePath: string): Promise<string> {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value;
}

async function processDocuments(directory: string, companyId: string) {
  console.log(`Processing documents from: ${directory} for Company ID: ${companyId}`);

  try {
    const files = await fs.readdir(directory);
    console.log(`Found ${files.length} files to process.`);

    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      console.error(`[ERROR] Company with ID "${companyId}" does not exist. Please create it first.`);
      process.exit(1);
    }

    for (const file of files) {
      const filePath = path.join(directory, file);
      console.log(`
Processing: ${file}`);
      let content = '';
      let documentType = path.extname(file).replace('.', '');

      try {
        if (documentType === 'pdf') {
          content = await getTextFromPdf(filePath);
        } else if (documentType === 'docx') {
          content = await getTextFromDocx(filePath);
        } else {
          console.warn(`  [SKIP] Unsupported file type: ${file}`);
          continue;
        }

        if (!content || content.trim().length === 0) {
          console.warn(`  [SKIP] No content extracted from ${file}.`);
          continue;
        }

        const documentName = path.parse(file).name;
        const documentsCollectionRef = companyRef.collection('documents');
        const documentRef = documentsCollectionRef.doc();
        const documentId = documentRef.id;
        
        console.log(`  Creating document record with ID: ${documentId}`);

        await documentRef.set({
          id: documentId,
          companyId,
          fileName: file,
          title: documentName,
          documentType,
          status: 'processing',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

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

        console.log(`  [SUCCESS] Stored ${chunks.length} chunks for document ${documentId}`);
      } catch (innerError) {
        console.error(`  [FAIL] Could not process ${file}:`, innerError);
        await adminDb.collection('companies').doc(companyId).collection('documents').doc().update({
          status: 'failed',
          error: (innerError as Error).message,
          updatedAt: FieldValue.serverTimestamp(),
        }).catch(err => console.error(`Failed to update document status to "failed":`, err));
      }
    }
    console.log('
All documents processed successfully.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`Error: Directory not found at ${directory}`);
        console.log('Please ensure the directory exists and contains your benefit documents.');
    } else {
        console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}

program.action(async (options) => {
  await processDocuments(options.directory, options.companyId);
});

program.parse(process.argv);
