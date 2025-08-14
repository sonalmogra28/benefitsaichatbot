// lib/ai/providers.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI();

export const myProvider = {
  languageModel: (modelName: string) => google(modelName),
};
