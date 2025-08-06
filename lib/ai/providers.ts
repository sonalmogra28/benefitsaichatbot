import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { isTestEnvironment } from '../constants';

// Instantiate Anthropic client
const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : new Anthropic();

// Providers map for different LLM backends
const providersMap: Record<string, ReturnType<typeof customProvider>> = {
  // OpenAI-based provider
  openai: customProvider({
    languageModels: {
      'chat-model': openai('gpt-4o'),
      'chat-model-reasoning': wrapLanguageModel({
        model: openai('gpt-4o'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': openai('gpt-4o-mini'),
      'artifact-model': openai('gpt-4o'),
    },
    imageModels: {
      'small-model': openai.imageModel('dall-e-3'),
    },
  }),
  // Anthropic-based provider
  anthropic: customProvider({
    languageModels: {
      'claude-3.5-sonnet': async ({
        prompt,
        system,
      }: { prompt: string; system?: string }) => {
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
          [];
        if (system) messages.push({ role: 'assistant', content: system }); // Anthropic doesn't have system role
        messages.push({ role: 'user', content: prompt });
        const res = await anthropicClient.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          messages,
          max_tokens: 4096,
        });
        return res.content;
      },
    },
  }),
};
// Select provider based on env var or test environment
export const myProvider = isTestEnvironment
  ? providersMap.openai
  : providersMap[process.env.LLM_PROVIDER || 'openai'];
