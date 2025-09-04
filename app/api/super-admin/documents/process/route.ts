// app/api/super-admin/documents/process/route.ts
import { NextResponse } from 'next/server';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { db } from '@/lib/firestore';
import { collection, addDoc } from 'firebase/firestore';

const documentaiClient = new DocumentProcessorServiceClient();
const predictionServiceClient = new PredictionServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

export async function POST(request: Request) {
  const { gcsUri, contentType } = await request.json();

  try {
    // 1. Extract text from the document using Document AI
    const name = `projects/benefitschatbotac-383/locations/us/processors/e4ee083e45e70862`;
    const docRequest = {
      name,
      rawDocument: {
        content: null,
        gcsUri: gcsUri,
        mimeType: contentType,
      },
    };
    const [result] = await documentaiClient.processDocument(docRequest);
    const text = result.document?.text || '';

    // 2. Generate embeddings using Vertex AI
    const publisher = 'google';
    const model = 'textembedding-gecko@003';
    const endpoint = `projects/benefitschatbotac-383/locations/us-central1/publishers/${publisher}/models/${model}`;
    const instances = [helpers.toValue({ content: text })] as any[];
    const parameters = helpers.toValue({
      autoTruncate: true,
    }) as any;

    const embeddingRequest = {
      endpoint,
      instances,
      parameters,
    } as any;

    const [response] = (await predictionServiceClient.predict(
      embeddingRequest,
    )) as any;
    const embeddings =
      response?.predictions?.[0]?.structValue?.fields?.embedding?.listValue?.values?.map(
        (v: any) => v.numberValue,
      ) || [];

    // 3. Store the text and embeddings in Firestore
    await addDoc(collection(db, 'documents'), {
      text,
      embeddings,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 },
    );
  }
}
