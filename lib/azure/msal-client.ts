import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';
import { logger } from '@/lib/logging/logger';

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: `https://<your-tenant-name>.b2clogin.com/<your-tenant-name>.onmicrosoft.com/<your-signin-signup-policy>`,
    knownAuthorities: ['<your-tenant-name>.b2clogin.com'],
    redirectUri: '/',
    postLogoutRedirectUri: '/',
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
          case LogLevel.Error:
            logger.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            logger.warn(message);
            return;
        }
      },
    },
  },
};

export const msalInstance = new PublicClientApplication(MSAL_CONFIG);

export const loginRequest = {
  scopes: ['openid', 'offline_access'],
};
