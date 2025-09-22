import { logger } from '@/lib/logger';
import { OpenAI } from '@/lib/azure/openai';

export interface GenerateTextRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class AzureOpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    try {
      const response = await this.openai.generateText({
        messages: request.messages,
        maxTokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7
      });

      return {
        content: response.content,
        usage: response.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      logger.error('Azure OpenAI service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: request.model,
        messageCount: request.messages.length
      });
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.openai.generateEmbeddings(text);
      return response.embeddings;
    } catch (error) {
      logger.error('Azure OpenAI embeddings error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length
      });
      throw error;
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
