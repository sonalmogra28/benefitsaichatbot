/**
 * Deployment abstraction layer
 * Supports both Workday integration and subdomain deployment models
 */

export type DeploymentMode = 'workday' | 'subdomain' | 'standalone';

export interface DeploymentConfig {
  mode: DeploymentMode;
  workday?: {
    tenantId: string;
    ssoConfig: {
      issuer: string;
      ssoUrl: string;
      certificate?: string;
      jwksUrl?: string;
    };
    embedConfig: {
      containerId: string;
      theme: 'light' | 'dark' | 'auto';
      height: string;
      width: string;
    };
  };
  subdomain?: {
    domain: string;
    ssl: boolean;
    cdn: boolean;
  };
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  features: {
    sso: boolean;
    analytics: boolean;
    documentUpload: boolean;
    benefitsComparison: boolean;
    adminPortal: boolean;
  };
}

export interface TenantConfig {
  id: string;
  name: string;
  deployment: DeploymentConfig;
  dataIsolation: boolean;
  customDomain?: string;
}

export class DeploymentManager {
  private config: DeploymentConfig;
  private tenantId: string;

  constructor(config: DeploymentConfig, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  getDeploymentMode(): DeploymentMode {
    return this.config.mode;
  }

  isWorkdayDeployment(): boolean {
    return this.config.mode === 'workday';
  }

  isSubdomainDeployment(): boolean {
    return this.config.mode === 'subdomain';
  }

  getWorkdayConfig() {
    if (!this.isWorkdayDeployment()) {
      throw new Error('Not a Workday deployment');
    }
    return this.config.workday;
  }

  getSubdomainConfig() {
    if (!this.isSubdomainDeployment()) {
      throw new Error('Not a subdomain deployment');
    }
    return this.config.subdomain;
  }

  getBrandingConfig() {
    return this.config.branding;
  }

  getFeatureFlags() {
    return this.config.features;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getBaseUrl(): string {
    switch (this.config.mode) {
      case 'workday':
        return `/workday/${this.tenantId}`;
      case 'subdomain':
        return `https://${this.config.subdomain?.domain}`;
      case 'standalone':
        return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      default:
        throw new Error('Invalid deployment mode');
    }
  }

  getApiUrl(): string {
    return `${this.getBaseUrl()}/api`;
  }

  getAuthUrl(): string {
    return `${this.getBaseUrl()}/auth`;
  }
}

// Factory function to create deployment manager
export function createDeploymentManager(tenantId: string): DeploymentManager {
  // This would typically load from database or environment
  const config = getTenantDeploymentConfig(tenantId);
  return new DeploymentManager(config, tenantId);
}

// Mock function - would be replaced with actual database lookup
function getTenantDeploymentConfig(tenantId: string): DeploymentConfig {
  // Default configuration - would be loaded from database
  return {
    mode: 'subdomain', // Default to subdomain for now
    subdomain: {
      domain: `benefits.${tenantId}.com`,
      ssl: true,
      cdn: true,
    },
    branding: {
      logo: '/default-logo.png',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'Inter',
    },
    features: {
      sso: true,
      analytics: true,
      documentUpload: true,
      benefitsComparison: true,
      adminPortal: true,
    },
  };
}
