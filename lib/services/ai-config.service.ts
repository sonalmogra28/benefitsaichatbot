import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface AIConfig {
  id: string;
  personality: string;
  tone: 'formal' | 'friendly' | 'neutral' | 'humorous';
  responseLength: number;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enabledFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface AIConfigFormValues {
  personality: string;
  tone: 'formal' | 'friendly' | 'neutral' | 'humorous';
  responseLength: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enabledFeatures?: string[];
}

export class AIConfigService {
  private configRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.configRepository = repositories.documents; // Using documents container for AI config
  }

  async getAIConfig(): Promise<AIConfig | null> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.type = 'ai_config' ORDER BY c.updatedAt DESC`;
      const { resources } = await this.configRepository.query(query);
      
      if (resources.length === 0) {
        return null;
      }

      return resources[0];
    } catch (error) {
      logger.error('Failed to get AI config', error);
      return null;
    }
  }

  async saveAIConfig(config: AIConfigFormValues, updatedBy: string): Promise<AIConfig> {
    try {
      await this.initializeRepository();
      
      // Check if config already exists
      const existingConfig = await this.getAIConfig();
      
      const configDoc: AIConfig = {
        id: existingConfig?.id || `ai_config_${Date.now()}`,
        personality: config.personality,
        tone: config.tone,
        responseLength: config.responseLength,
        model: config.model || 'gpt-4',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 2048,
        systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
        enabledFeatures: config.enabledFeatures || [],
        createdAt: existingConfig?.createdAt || new Date(),
        updatedAt: new Date(),
        updatedBy
      };

      if (existingConfig) {
        await this.configRepository.update(configDoc.id, configDoc);
      } else {
        await this.configRepository.create({
          ...configDoc,
          type: 'ai_config'
        });
      }

      logger.info('AI config saved successfully', {
        updatedBy,
        configId: configDoc.id
      });

      return configDoc;
    } catch (error) {
      logger.error('Failed to save AI config', error, {
        updatedBy
      });
      throw error;
    }
  }

  async getDefaultAIConfig(): Promise<AIConfig> {
    return {
      id: 'default',
      personality: 'You are a helpful and friendly benefits assistant.',
      tone: 'friendly',
      responseLength: 250,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful AI assistant that specializes in employee benefits and HR questions.',
      enabledFeatures: ['chat', 'document_search', 'benefits_calculation'],
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    };
  }

  async resetToDefaults(updatedBy: string): Promise<AIConfig> {
    try {
      const defaultConfig = await this.getDefaultAIConfig();
      defaultConfig.updatedBy = updatedBy;
      defaultConfig.updatedAt = new Date();
      
      return await this.saveAIConfig(defaultConfig, updatedBy);
    } catch (error) {
      logger.error('Failed to reset AI config to defaults', error, {
        updatedBy
      });
      throw error;
    }
  }

  async validateConfig(config: AIConfigFormValues): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!config.personality || config.personality.length < 10) {
      errors.push('Personality must be at least 10 characters long');
    }

    if (config.responseLength < 50 || config.responseLength > 500) {
      errors.push('Response length must be between 50 and 500 characters');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
      errors.push('Temperature must be between 0 and 1');
    }

    if (config.maxTokens !== undefined && (config.maxTokens < 1 || config.maxTokens > 4096)) {
      errors.push('Max tokens must be between 1 and 4096');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const aiConfigService = new AIConfigService();
