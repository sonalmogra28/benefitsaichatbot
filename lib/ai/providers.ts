// lib/ai/providers.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { streamText } from 'ai';

const {
  GCP_PROJECT,
  GCP_REGION,
  VERTEX_AI_MODEL,
} = process.env;

if (!GCP_PROJECT || !GCP_REGION || !VERTEX_AI_MODEL) {
    throw new Error('Missing Vertex AI model configuration.');
}

// Setup for Google's new Vertex AI SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

const vertexAI = genAI.getGenerativeModel({
    model: VERTEX_AI_MODEL,
    // Add other generation config here
});

export const vertexAILanguageModel = {
    async stream(prompt: string, system?: string) {
        const chat = vertexAI.startChat({
            history: system ? [{ role: 'user', parts: [{ text: system }] }, { role: 'model', parts: [{ text: 'OK' }] }] : [],
        });

        const result = await chat.sendMessageStream(prompt);
        return result.stream;
    },
    async generate(prompt: string, system?: string) {
        const chat = vertexAI.startChat({
            history: system ? [{ role: 'user', parts: [{ text: system }] }, { role: 'model', parts: [{ text: 'OK' }] }] : [],
        });

        const result = await chat.sendMessage(prompt);
        const response = result.response;
        return response.text();
    }
};

// This is a simplified example. In a real app, you would have a more
// robust way to handle different models and providers.
export const myProvider = {
    languageModels: {
        'chat-model': vertexAILanguageModel,
        'title-model': vertexAILanguageaModel,
    },
};
