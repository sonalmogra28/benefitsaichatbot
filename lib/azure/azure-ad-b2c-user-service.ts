import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { getAdB2CConfig } from './config';
import { logger } from '@/lib/logger';

// Custom authentication provider for Microsoft Graph
class GraphAuthProvider implements AuthenticationProvider {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token using client credentials flow
    const adB2CConfig = getAdB2CConfig();
    const tokenEndpoint = `https://login.microsoftonline.com/${adB2CConfig.tenantName}.onmicrosoft.com/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: adB2CConfig.clientId,
      client_secret: adB2CConfig.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000) - 60000); // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Microsoft Graph access token', { error });
      throw new Error('Failed to authenticate with Microsoft Graph');
    }
  }
}

export interface AzureADB2CUser {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  createdDateTime: string;
  userType: string;
  identities: Array<{
    signInType: string;
    issuer: string;
    issuerAssignedId: string;
  }>;
}

export interface CreateUserRequest {
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  password?: string;
  accountEnabled?: boolean;
  userType?: string;
  companyId?: string;
  role?: string;
}

export class AzureADB2CUserService {
  private graphClient: Client;
  private authProvider: GraphAuthProvider;

  constructor() {
    this.authProvider = new GraphAuthProvider();
    this.graphClient = Client.initWithMiddleware({
      authProvider: this.authProvider,
    });
  }

  /**
   * Create a new user in Azure AD B2C
   */
  async createUser(userData: CreateUserRequest): Promise<AzureADB2CUser> {
    try {
      const adB2CConfig = getAdB2CConfig();
      
      // Generate a temporary password if not provided
      const password = userData.password || this.generateTemporaryPassword();
      
      // Create the user object for Microsoft Graph
      const userObject = {
        accountEnabled: userData.accountEnabled !== false,
        displayName: userData.displayName,
        givenName: userData.givenName,
        surname: userData.surname,
        mail: userData.mail,
        userPrincipalName: userData.mail,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: password,
        },
        userType: userData.userType || 'Member',
        identities: [
          {
            signInType: 'emailAddress',
            issuer: `${adB2CConfig.tenantName}.onmicrosoft.com`,
            issuerAssignedId: userData.mail,
          },
        ],
        // Add custom attributes for company and role
        ...(userData.companyId && {
          [`extension_${adB2CConfig.clientId.replace(/-/g, '')}_CompanyId`]: userData.companyId,
        }),
        ...(userData.role && {
          [`extension_${adB2CConfig.clientId.replace(/-/g, '')}_Role`]: userData.role,
        }),
      };

      logger.info('Creating Azure AD B2C user', {
        email: userData.mail,
        displayName: userData.displayName,
        companyId: userData.companyId,
        role: userData.role,
      });

      const createdUser = await this.graphClient.api('/users').post(userObject);

      logger.info('Azure AD B2C user created successfully', {
        userId: createdUser.id,
        email: createdUser.mail,
        displayName: createdUser.displayName,
      });

      return createdUser;
    } catch (error) {
      logger.error('Failed to create Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userData: {
          email: userData.mail,
          displayName: userData.displayName,
        },
      });
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<AzureADB2CUser | null> {
    try {
      const user = await this.graphClient.api(`/users/${userId}`).get();
      return user;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      logger.error('Failed to get Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<AzureADB2CUser | null> {
    try {
      const users = await this.graphClient
        .api('/users')
        .filter(`mail eq '${email}'`)
        .get();

      return users.value && users.value.length > 0 ? users.value[0] : null;
    } catch (error) {
      logger.error('Failed to get Azure AD B2C user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, updates: Partial<CreateUserRequest>): Promise<AzureADB2CUser> {
    try {
      const updateObject: any = {};

      if (updates.displayName) updateObject.displayName = updates.displayName;
      if (updates.givenName) updateObject.givenName = updates.givenName;
      if (updates.surname) updateObject.surname = updates.surname;
      if (updates.mail) updateObject.mail = updates.mail;
      if (updates.accountEnabled !== undefined) updateObject.accountEnabled = updates.accountEnabled;

      // Update custom attributes
      const adB2CConfig = getAdB2CConfig();
      if (updates.companyId) {
        updateObject[`extension_${adB2CConfig.clientId.replace(/-/g, '')}_CompanyId`] = updates.companyId;
      }
      if (updates.role) {
        updateObject[`extension_${adB2CConfig.clientId.replace(/-/g, '')}_Role`] = updates.role;
      }

      const updatedUser = await this.graphClient.api(`/users/${userId}`).patch(updateObject);

      logger.info('Azure AD B2C user updated successfully', {
        userId,
        updates: Object.keys(updateObject),
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.graphClient.api(`/users/${userId}`).delete();

      logger.info('Azure AD B2C user deleted successfully', { userId });
    } catch (error) {
      logger.error('Failed to delete Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(skipToken?: string, limit: number = 100): Promise<{
    users: AzureADB2CUser[];
    nextToken?: string;
  }> {
    try {
      let request = this.graphClient.api('/users').top(limit);
      
      if (skipToken) {
        request = request.skipToken(skipToken);
      }

      const response = await request.get();
      
      return {
        users: response.value || [],
        nextToken: response['@odata.nextLink'] ? this.extractSkipToken(response['@odata.nextLink']) : undefined,
      };
    } catch (error) {
      logger.error('Failed to list Azure AD B2C users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate a temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each required type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special character
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Extract skip token from next link
   */
  private extractSkipToken(nextLink: string): string | undefined {
    try {
      const url = new URL(nextLink);
      return url.searchParams.get('$skiptoken') || undefined;
    } catch {
      return undefined;
    }
  }
}

export const azureADB2CUserService = new AzureADB2CUserService();
