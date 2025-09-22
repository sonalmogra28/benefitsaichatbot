import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { logger } from '@/lib/logging/logger';

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID || '',
    authority: `https://<your-tenant-name>.b2clogin.com/<your-tenant-name>.onmicrosoft.com/<your-signin-signup-policy>`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
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

export const confidentialClientApplication = new ConfidentialClientApplication(MSAL_CONFIG);
