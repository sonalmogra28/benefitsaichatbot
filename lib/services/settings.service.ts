import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface PlatformSettings {
  platform: {
    name: string;
    url: string;
    supportEmail: string;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  security: {
    mfaRequired: boolean;
    sessionTimeout: number;
    passwordMinLength: number;
    passwordRequireSpecial: boolean;
    maxLoginAttempts: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    newUserNotification: boolean;
    systemAlerts: boolean;
    weeklyReports: boolean;
  };
  ai: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    streamingEnabled: boolean;
  };
  storage: {
    provider: string;
    maxStoragePerCompany: number;
    autoDeleteAfter: number;
    compressionEnabled: boolean;
  };
}

export interface SettingsDocument {
  id: string;
  type: 'platform_settings';
  settings: PlatformSettings;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export class SettingsService {
  private settingsRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.settingsRepository = repositories.documents; // Using documents container for settings
  }

  async getSettings(): Promise<PlatformSettings | null> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.type = 'platform_settings' ORDER BY c.updatedAt DESC`;
      const { resources } = await this.settingsRepository.query(query);
      
      if (resources.length === 0) {
        return null;
      }

      return resources[0].settings;
    } catch (error) {
      logger.error('Failed to get platform settings', error);
      throw error;
    }
  }

  async saveSettings(settings: PlatformSettings, updatedBy: string): Promise<PlatformSettings> {
    try {
      await this.initializeRepository();
      
      // Check if settings already exist
      const existingQuery = `SELECT * FROM c WHERE c.type = 'platform_settings'`;
      const { resources: existing } = await this.settingsRepository.query(existingQuery);
      
      const settingsDocument: SettingsDocument = {
        id: existing.length > 0 ? existing[0].id : `settings_${Date.now()}`,
        type: 'platform_settings',
        settings,
        createdAt: existing.length > 0 ? existing[0].createdAt : new Date(),
        updatedAt: new Date(),
        updatedBy
      };

      if (existing.length > 0) {
        await this.settingsRepository.update(settingsDocument.id, settingsDocument);
      } else {
        await this.settingsRepository.create(settingsDocument);
      }

      logger.info('Platform settings saved successfully', {
        updatedBy,
        settingsType: 'platform_settings'
      });

      return settings;
    } catch (error) {
      logger.error('Failed to save platform settings', error, {
        updatedBy
      });
      throw error;
    }
  }

  async saveSectionSettings(section: string, sectionSettings: any, updatedBy: string): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      
      if (!currentSettings) {
        throw new Error('No existing settings found');
      }

      const updatedSettings = {
        ...currentSettings,
        [section]: sectionSettings
      };

      await this.saveSettings(updatedSettings, updatedBy);
      
      logger.info('Section settings saved successfully', {
        section,
        updatedBy
      });
    } catch (error) {
      logger.error('Failed to save section settings', error, {
        section,
        updatedBy
      });
      throw error;
    }
  }

  async getDefaultSettings(): Promise<PlatformSettings> {
    return {
      platform: {
        name: 'Benefits Assistant Chatbot',
        url: 'https://benefits.example.com',
        supportEmail: 'support@benefits.example.com',
        maxFileSize: 10,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'png', 'jpg'],
      },
      security: {
        mfaRequired: false,
        sessionTimeout: 30,
        passwordMinLength: 8,
        passwordRequireSpecial: true,
        maxLoginAttempts: 5,
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        newUserNotification: true,
        systemAlerts: true,
        weeklyReports: false,
      },
      ai: {
        provider: 'vertex-ai',
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxTokens: 2048,
        streamingEnabled: true,
      },
      storage: {
        provider: 'azure',
        maxStoragePerCompany: 10,
        autoDeleteAfter: 90,
        compressionEnabled: true,
      },
    };
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
