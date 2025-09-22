/**
 * Hybrid AI Service - Direct OpenAI API Integration
 * Replaces Azure OpenAI with direct OpenAI API for cost efficiency
 */

import OpenAI from 'openai';
import { SimpleLogger } from './simple-logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class HybridAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getChatResponse(
    messages: ChatMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<ChatResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || 'gpt-4o-mini', // Cost-effective model
        messages,
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content from OpenAI');
      }

      return {
        content: choice.message.content,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      SimpleLogger.error('OpenAI API call failed', error, { messages: messages.length });
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Cost-effective embedding model
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      SimpleLogger.error('OpenAI embedding generation failed', error, { textLength: text.length });
      throw error;
    }
  }

  async moderateContent(text: string): Promise<{ flagged: boolean; categories?: string[] }> {
    try {
      const response = await this.openai.moderations.create({
        input: text,
      });

      const result = response.results[0];
      return {
        flagged: result.flagged,
        categories: result.flagged ? Object.keys(result.categories).filter(
          key => result.categories[key as keyof typeof result.categories]
        ) : undefined,
      };
    } catch (error) {
      SimpleLogger.error('OpenAI content moderation failed', error, { textLength: text.length });
      throw error;
    }
  }
}

export const hybridAIService = new HybridAIService();
