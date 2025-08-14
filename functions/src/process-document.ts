// functions/src/process-document.ts
import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { vertexAIVectorSearch } from './vectors';
import { getEmbeddings } from './embeddings';

const storage = new Storage();
const documentai = new DocumentProcessorServiceClient();

export const processDocument = functions.storage
  .object()
  .onFinalize(async (object) => {
    const { bucket, name } = object;

    if (!name) {
      console.log('No file name found.');
      return;
    }

    const [companyId, fileName] = name.split('/');

    const gcsUri = `gs://${bucket}/${name}`;

    const [result] = await documentai.processDocument({
      name: `projects/${process.env.GCP_PROJECT}/locations/us/processors/YOUR_PROCESSOR_ID`,
      rawDocument: {
        content: gcsUri,
        mimeType: 'application/pdf',
      },
    });

    if (result.document?.text) {
      const embeddings = await getEmbeddings(result.document.text);
      await vertexAIVectorSearch.upsert([
        {
          datapointId: name,
          featureVector: embeddings,
        },
      ]);
    }
  });
