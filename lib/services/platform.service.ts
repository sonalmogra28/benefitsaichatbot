
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// This interface will be expanded as needed for platform-wide settings.
export interface PlatformSettings {
  id: 'default';
  // Example setting: allow new user registrations
  allowRegistrations: boolean;
  // More settings can be added here, e.g., maintenance mode notices.
  updatedAt?: FieldValue;
}

class PlatformService {
  private settingsDocRef = db.collection('platform').doc('settings');

  /**
   * Retrieves the current platform settings.
   * @returns The platform settings object.
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const doc = await this.settingsDocRef.get();
      if (!doc.exists) {
        // If no settings exist, create with default values
        const defaultSettings: PlatformSettings = {
          id: 'default',
          allowRegistrations: true, 
        };
        await this.settingsDocRef.set(defaultSettings);
        return defaultSettings;
      }
      return doc.data() as PlatformSettings;
    } catch (error) {
      console.error("Error retrieving platform settings:", error);
      throw new Error("Could not retrieve platform settings.");
    }
  }

  /**
   * Updates platform settings.
   * @param updates The partial settings data to update.
   * @returns The updated platform settings.
   */
  async updatePlatformSettings(updates: Partial<Omit<PlatformSettings, 'id'>>): Promise<PlatformSettings> {
    try {
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      };
      await this.settingsDocRef.set(updateData, { merge: true });

      const updatedDoc = await this.settingsDocRef.get();
      return updatedDoc.data() as PlatformSettings;
    } catch (error) {
      console.error("Error updating platform settings:", error);
      throw new Error("Could not update platform settings.");
    }
  }
}

export const platformService = new PlatformService();
export { PlatformService };
