const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
const { helpers } = require('@google-cloud/aiplatform');

admin.initializeApp();

const documentaiClient = new DocumentProcessorServiceClient();

exports.processDocument = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const gcsUri = `gs://${fileBucket}/${filePath}`;

  try {
    // 1. Extract text from the document using Document AI
    const name = `projects/benefitschatbotac-383/locations/us/processors/e4ee083e45e70862`;
    const request = {
      name,
      rawDocument: {
        content: null,
        gcsUri: gcsUri,
        mimeType: object.contentType,
      },
    };
    const [result] = await documentaiClient.processDocument(request);
    const { text } = result.document;

    // 2. Generate embeddings using Vertex AI
    const predictionServiceClient = new PredictionServiceClient({
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    });
    const publisher = 'google';
    const model = 'textembedding-gecko@003';
    const endpoint = `projects/benefitschatbotac-383/locations/us-central1/publishers/${publisher}/models/${model}`;
    const instances = [helpers.toValue({ content: text })];
    const parameters = helpers.toValue({
      autoTruncate: true,
    });

    const embeddingRequest = {
      endpoint,
      instances,
      parameters,
    };

    const [response] = await predictionServiceClient.predict(embeddingRequest);
    const embeddings = response.predictions[0].structValue.fields.embedding.listValue.values.map(v => v.numberValue);

    // 3. For now, just log the embeddings
    console.log('Embeddings generated successfully:');
    console.log(embeddings);

  } catch (error) {
    console.error('Error processing document:', error);
  }
});
