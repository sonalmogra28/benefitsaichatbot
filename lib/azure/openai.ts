import OpenAI from 'openai';
import { azureConfig, getOpenAIConfig } from './config';
import { logger } from '@/lib/logger';

// Initialize OpenAI client
const openaiConfig = getOpenAIConfig();
const client = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.endpoint,
});

// Azure OpenAI service class
export class AzureOpenAIService {
  constructor(private client: OpenAI) {}

  async generateText(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<string> {
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const response = await this.client.chat.completions.create({
        model: openaiConfig.deploymentName || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      logger.info('Text generated successfully', {
        promptLength: prompt.length,
        responseLength: content.length,
        usage: response.usage
      });

      return content;
    } catch (error) {
      logger.error('Failed to generate text', {
        promptLength: prompt.length,
        options
      }, error as Error);
      throw error;
    }
  }

  async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const response = await this.client.chat.completions.create({
        model: openaiConfig.deploymentName || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      const usage = response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };

      logger.info('Chat completion generated successfully', {
        messageCount: messages.length,
        responseLength: content.length,
        usage
      });

      return {
        content,
        usage: {
          promptTokens: (usage as any).promptTokens || 0,
          completionTokens: (usage as any).completionTokens || 0,
          totalTokens: (usage as any).totalTokens || usage.total_tokens || 0
        }
      };
    } catch (error) {
      logger.error('Failed to generate chat completion', {
        messageCount: messages.length,
        options
      }, error as Error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: openaiConfig.embeddingDeployment,
        input: text
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding generated');
      }

      logger.info('Embedding generated successfully', {
        textLength: text.length,
        embeddingDimensions: embedding.length,
        usage: response.usage
      });

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        textLength: text.length
      }, error as Error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: openaiConfig.embeddingDeployment,
        input: texts
      });

      const embeddings = response.data.map((item: any) => item.embedding);
      if (embeddings.length !== texts.length) {
        throw new Error('Mismatch between input texts and generated embeddings');
      }

      logger.info('Embeddings generated successfully', {
        textCount: texts.length,
        embeddingDimensions: embeddings[0]?.length || 0,
        usage: response.usage
      });

      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings', {
        textCount: texts.length
      }, error as Error);
      throw error;
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    } = {}
  ): Promise<AsyncIterable<string>> {
    try {
      const {
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9,
        frequencyPenalty = 0,
        presencePenalty = 0,
        stop = []
      } = options;

      const stream = await this.client.chat.completions.create(
        openaiConfig.deploymentName,
        messages,
        {
          maxTokens,
          temperature,
          topP,
          frequencyPenalty,
          presencePenalty,
          stop
        }
      );

      logger.info('Chat completion stream started', {
        messageCount: messages.length,
        options
      });

      return this.processStream(stream);
    } catch (error) {
      logger.error('Failed to start chat completion stream', {
        messageCount: messages.length,
        options
      }, error as Error);
      throw error;
    }
  }

  private async *processStream(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('Error processing stream', {}, error as Error);
      throw error;
    }
  }

  async moderateContent(text: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    scores: Record<string, number>;
  }> {
    try {
      // Note: Azure OpenAI doesn't have a built-in moderation endpoint
      // This would typically use Azure Content Safety or a third-party service
      // For now, we'll return a basic response
      
      logger.info('Content moderation check', {
        textLength: text.length
      });

      return {
        flagged: false,
        categories: {
          hate: false,
          hateThreatening: false,
          selfHarm: false,
          sexual: false,
          sexualMinors: false,
          violence: false,
          violenceGraphic: false
        },
        scores: {
          hate: 0,
          hateThreatening: 0,
          selfHarm: 0,
          sexual: 0,
          sexualMinors: 0,
          violence: 0,
          violenceGraphic: 0
        }
      };
    } catch (error) {
      logger.error('Failed to moderate content', {
        textLength: text.length
      }, error as Error);
      throw error;
    }
  }

  async getModels(): Promise<Array<{ id: string; object: string; created: number; ownedBy: string }>> {
    try {
      // Note: Azure OpenAI doesn't expose the same models endpoint as OpenAI
      // This would typically return the available deployments
      
      logger.info('Models requested');

      return [
        {
          id: openaiConfig.deploymentName,
          object: 'model',
          created: Date.now(),
          ownedBy: 'azure'
        }
      ];
    } catch (error) {
      logger.error('Failed to get models', {}, error as Error);
      throw error;
    }
  }
}

// Create service instance
export const azureOpenAIService = new AzureOpenAIService(client);

// Export the client for advanced operations
export { client as openaiClient };
