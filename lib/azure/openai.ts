import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { azureConfig, getOpenAIConfig } from './config';
import { logger } from '@/lib/logging/logger';

// Initialize Azure OpenAI client
const openaiConfig = getOpenAIConfig();
const client = new OpenAIClient(
  openaiConfig.endpoint,
  new AzureKeyCredential(openaiConfig.apiKey)
);

// Azure OpenAI service class
export class AzureOpenAIService {
  constructor(private client: OpenAIClient) {}

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

      const response = await this.client.getChatCompletions(
        openaiConfig.deploymentName,
        [
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          maxTokens,
          temperature,
          topP,
          frequencyPenalty,
          presencePenalty,
          stop
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      logger.info('Text generated successfully', {
        promptLength: prompt.length,
        responseLength: content.length,
        usage: response.usage
      });

      return content;
    } catch (error) {
      logger.error('Failed to generate text', error, {
        promptLength: prompt.length,
        options
      });
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

      const response = await this.client.getChatCompletions(
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
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens
        }
      };
    } catch (error) {
      logger.error('Failed to generate chat completion', error, {
        messageCount: messages.length,
        options
      });
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.getEmbeddings(
        openaiConfig.embeddingDeployment,
        [text]
      );

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
      logger.error('Failed to generate embedding', error, {
        textLength: text.length
      });
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.getEmbeddings(
        openaiConfig.embeddingDeployment,
        texts
      );

      const embeddings = response.data.map(item => item.embedding);
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
      logger.error('Failed to generate embeddings', error, {
        textCount: texts.length
      });
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

      const stream = await this.client.streamChatCompletions(
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
      logger.error('Failed to start chat completion stream', error, {
        messageCount: messages.length,
        options
      });
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
      logger.error('Error processing stream', error);
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
      logger.error('Failed to moderate content', error, {
        textLength: text.length
      });
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
      logger.error('Failed to get models', error);
      throw error;
    }
  }
}

// Create service instance
export const azureOpenAIService = new AzureOpenAIService(client);

// Export the client for advanced operations
export { client as openaiClient };
