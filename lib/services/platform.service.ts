import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '../utils/logger-fix';

// This interface will be expanded as needed for platform-wide settings.
export interface PlatformSettings {
  id: 'default';
  // Example setting: allow new user registrations
  allowRegistrations: boolean;
  // More settings can be added here, e.g., maintenance mode notices.
  updatedAt?: string;
}

class PlatformService {
  private async getPlatformRepository() {
    const repositories = await getRepositories();
    return repositories.companies; // Using companies container for platform settings
  }

  /**
   * Retrieves the current platform settings.
   * @returns The platform settings object.
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const repository = await this.getPlatformRepository();
      const settings = await repository.getById('platform-settings');
      
      if (!settings) {
        // If no settings exist, create with default values
        const defaultSettings: PlatformSettings = {
          id: 'default',
          allowRegistrations: true,
          updatedAt: new Date().toISOString(),
        };
        await repository.create(defaultSettings);
        
        logger.info('Platform settings created with defaults');
        return defaultSettings;
      }
      
      logger.info('Platform settings retrieved successfully');
      return settings as PlatformSettings;
    } catch (error) {
      logger.error('Error retrieving platform settings', error);
      throw new Error('Could not retrieve platform settings.');
    }
  }

  /**
   * Updates platform settings.
   * @param updates The partial settings data to update.
   * @returns The updated platform settings.
   */
  async updatePlatformSettings(
    updates: Partial<Omit<PlatformSettings, 'id'>>,
  ): Promise<PlatformSettings> {
    try {
      const repository = await this.getPlatformRepository();
      
      // Get existing settings first
      const existingSettings = await repository.getById('platform-settings');
      if (!existingSettings) {
        throw new Error('Platform settings not found');
      }
      
      const updatedSettings = {
        ...existingSettings,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await repository.update('platform-settings', updatedSettings);
      
      logger.info('Platform settings updated successfully', { updates });
      return updatedSettings as PlatformSettings;
    } catch (error) {
      logger.error('Error updating platform settings', error, { updates });
      throw new Error('Could not update platform settings.');
    }
  }
}

export const platformService = new PlatformService();
export { PlatformService };
