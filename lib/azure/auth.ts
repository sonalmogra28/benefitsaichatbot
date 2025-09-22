import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { ConfidentialClientApplication, ClientCredentialRequest } from '@azure/msal-node';
import { azureConfig, getAdB2CConfig } from './config';
import { logger } from '@/lib/logger';

// MSAL configuration
const adB2CConfig = getAdB2CConfig();

const msalConfig: Configuration = {
  auth: {
    clientId: adB2CConfig.clientId,
    authority: `https://${adB2CConfig.tenantName}.b2clogin.com/${adB2CConfig.tenantName}.onmicrosoft.com/${adB2CConfig.signupSigninPolicy}`,
    knownAuthorities: [`${adB2CConfig.tenantName}.b2clogin.com`],
    redirectUri: typeof window !== 'undefined' ? window.location.origin : azureConfig.appUrl,
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : azureConfig.appUrl,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // LogLevel.Error
            logger.error('MSAL Error', { message });
            break;
          case 1: // LogLevel.Warning
            logger.warn('MSAL Warning', { message });
            break;
          case 2: // LogLevel.Info
            logger.info('MSAL Info', { message });
            break;
          case 3: // LogLevel.Verbose
            logger.info('MSAL Verbose', { message });
            break;
        }
      },
    },
  },
};

// Initialize MSAL instances
let msalInstance: PublicClientApplication | null = null;
let confidentialClient: ConfidentialClientApplication | null = null;

// Client-side MSAL instance
export const getMsalInstance = (): PublicClientApplication => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
};

// Server-side confidential client
export const getConfidentialClient = (): ConfidentialClientApplication => {
  if (!confidentialClient) {
    confidentialClient = new ConfidentialClientApplication({
      auth: {
        clientId: adB2CConfig.clientId,
        clientSecret: adB2CConfig.clientSecret,
        authority: `https://${adB2CConfig.tenantName}.b2clogin.com/${adB2CConfig.tenantName}.onmicrosoft.com/${adB2CConfig.signupSigninPolicy}`,
      },
    });
  }
  return confidentialClient;
};

// Authentication service class
export class AzureAuthService {
  constructor(private msal: PublicClientApplication) {}

  async login(): Promise<AuthenticationResult | null> {
    try {
      const loginRequest = {
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      };

      const response = await this.msal.loginPopup(loginRequest);
      
      logger.info('User logged in successfully', {
        userId: response.account?.localAccountId,
        username: response.account?.username
      });

      return response;
    } catch (error) {
      logger.error('Login failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async loginRedirect(): Promise<void> {
    try {
      const loginRequest = {
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      };

      await this.msal.loginRedirect(loginRequest);
    } catch (error) {
      logger.error('Login redirect failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const logoutRequest = {
        account: this.msal.getActiveAccount(),
        postLogoutRedirectUri: azureConfig.appUrl,
      };

      await this.msal.logoutPopup(logoutRequest);
      
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async getCurrentUser(): Promise<AccountInfo | null> {
    try {
      const account = this.msal.getActiveAccount();
      return account;
    } catch (error) {
      logger.error('Failed to get current user', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async getAccessToken(scopes: string[] = ['openid', 'profile', 'email']): Promise<string | null> {
    try {
      const account = this.msal.getActiveAccount();
      if (!account) {
        return null;
      }

      const tokenRequest = {
        scopes,
        account,
      };

      const response = await this.msal.acquireTokenSilent(tokenRequest);
      return response.accessToken;
    } catch (error) {
      logger.error('Failed to get access token', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async acquireTokenSilent(scopes: string[] = ['openid', 'profile', 'email']): Promise<AuthenticationResult | null> {
    try {
      const account = this.msal.getActiveAccount();
      if (!account) {
        return null;
      }

      const tokenRequest = {
        scopes,
        account,
      };

      const response = await this.msal.acquireTokenSilent(tokenRequest);
      return response;
    } catch (error) {
      logger.error('Failed to acquire token silently', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async acquireTokenPopup(scopes: string[] = ['openid', 'profile', 'email']): Promise<AuthenticationResult | null> {
    try {
      const tokenRequest = {
        scopes,
      };

      const response = await this.msal.acquireTokenPopup(tokenRequest);
      return response;
    } catch (error) {
      logger.error('Failed to acquire token with popup', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async handleRedirectPromise(): Promise<AuthenticationResult | null> {
    try {
      const response = await this.msal.handleRedirectPromise();
      return response;
    } catch (error) {
      logger.error('Failed to handle redirect promise', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  isLoggedIn(): boolean {
    const account = this.msal.getActiveAccount();
    return account !== null;
  }

  getAccountInfo(): AccountInfo | null {
    return this.msal.getActiveAccount();
  }

  // Server-side token validation
  async validateToken(token: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      name: string;
      roles: string[];
    };
    error?: string;
  }> {
    try {
      // This would typically involve validating the JWT token
      // For now, we'll return a basic validation
      
      logger.info('Token validation requested', {
        tokenLength: token.length
      });

      // In a real implementation, you would:
      // 1. Verify the JWT signature
      // 2. Check expiration
      // 3. Validate claims
      // 4. Extract user information

      return {
        valid: true,
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'User Name',
          roles: ['user']
        }
      };
    } catch (error) {
      logger.error('Token validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get user roles from token
  async getUserRoles(token: string): Promise<string[]> {
    try {
      // This would typically extract roles from the JWT token claims
      // For now, return default roles
      
      logger.info('User roles requested', {
        tokenLength: token.length
      });

      return ['user'];
    } catch (error) {
      logger.error('Failed to get user roles', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Check if user has specific role
  async hasRole(token: string, role: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(token);
      return roles.includes(role);
    } catch (error) {
      logger.error('Failed to check user role', { role, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  // Get user profile information
  async getUserProfile(token: string): Promise<{
    id: string;
    email: string;
    name: string;
    givenName?: string;
    familyName?: string;
    roles: string[];
  } | null> {
    try {
      const validation = await this.validateToken(token);
      if (!validation.valid || !validation.user) {
        return null;
      }

      return {
        id: validation.user.id,
        email: validation.user.email,
        name: validation.user.name,
        roles: validation.user.roles
      };
    } catch (error) {
      logger.error('Failed to get user profile', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }
}

// Create service instance
export const azureAuthService = new AzureAuthService(getMsalInstance());

// Export MSAL instance for React components
export { getMsalInstance as msalInstance };
