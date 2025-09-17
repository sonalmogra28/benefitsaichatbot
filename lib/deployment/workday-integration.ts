/**
 * Workday integration utilities
 * Handles SSO, embedding, and Workday-specific functionality
 */

import { DeploymentConfig } from './index';

export interface WorkdaySSOConfig {
  issuer: string;
  ssoUrl: string;
  certificate?: string;
  jwksUrl?: string;
  requiredClaims: string[];
}

export interface WorkdayEmbedConfig {
  containerId: string;
  theme: 'light' | 'dark' | 'auto';
  height: string;
  width: string;
  responsive: boolean;
}

export class WorkdayIntegration {
  private ssoConfig: WorkdaySSOConfig;
  private embedConfig: WorkdayEmbedConfig;
  private tenantId: string;

  constructor(
    ssoConfig: WorkdaySSOConfig,
    embedConfig: WorkdayEmbedConfig,
    tenantId: string
  ) {
    this.ssoConfig = ssoConfig;
    this.embedConfig = embedConfig;
    this.tenantId = tenantId;
  }

  /**
   * Generate Workday SSO URL for authentication
   */
  generateSSOUrl(returnUrl?: string): string {
    const params = new URLSearchParams({
      'SAMLRequest': this.generateSAMLRequest(),
      'RelayState': returnUrl || this.getDefaultReturnUrl(),
    });

    return `${this.ssoConfig.ssoUrl}?${params.toString()}`;
  }

  /**
   * Generate SAML request for SSO
   */
  private generateSAMLRequest(): string {
    // This would generate a proper SAML request
    // For now, returning a placeholder
    const samlRequest = {
      issuer: this.ssoConfig.issuer,
      destination: this.ssoConfig.ssoUrl,
      issueInstant: new Date().toISOString(),
      assertionConsumerServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback`,
    };

    return Buffer.from(JSON.stringify(samlRequest)).toString('base64');
  }

  /**
   * Get default return URL after SSO
   */
  private getDefaultReturnUrl(): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/workday/${this.tenantId}/chat`;
  }

  /**
   * Generate Workday Extend embed code
   */
  generateEmbedCode(): string {
    return `
      <div id="${this.embedConfig.containerId}" 
           style="width: ${this.embedConfig.width}; height: ${this.embedConfig.height};">
        <iframe 
          src="${process.env.NEXT_PUBLIC_APP_URL}/workday/${this.tenantId}/embed"
          width="100%" 
          height="100%" 
          frameborder="0"
          allow="microphone; camera; geolocation"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups">
        </iframe>
      </div>
    `;
  }

  /**
   * Generate Workday Extend configuration
   */
  generateExtendConfig(): object {
    return {
      tenantId: this.tenantId,
      containerId: this.embedConfig.containerId,
      theme: this.embedConfig.theme,
      responsive: this.embedConfig.responsive,
      features: {
        chat: true,
        documentUpload: true,
        benefitsComparison: true,
        analytics: true,
      },
      branding: {
        // This would be loaded from tenant configuration
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        logo: '/workday-logo.png',
      },
    };
  }

  /**
   * Validate Workday SSO response
   */
  validateSSOResponse(samlResponse: string): boolean {
    // This would validate the SAML response
    // For now, returning true as placeholder
    return true;
  }

  /**
   * Extract user information from SSO response
   */
  extractUserInfo(samlResponse: string): {
    email: string;
    employeeId: string;
    companyId: string;
    groups: string[];
    firstName?: string;
    lastName?: string;
  } {
    // This would parse the SAML response and extract user info
    // For now, returning mock data
    return {
      email: 'user@amerivet.com',
      employeeId: 'EMP001',
      companyId: this.tenantId,
      groups: ['employee'],
      firstName: 'John',
      lastName: 'Doe',
    };
  }

  /**
   * Generate Workday navigation menu items
   */
  generateNavigationItems(): Array<{
    id: string;
    label: string;
    url: string;
    icon?: string;
  }> {
    return [
      {
        id: 'benefits-chat',
        label: 'Benefits Assistant',
        url: `/workday/${this.tenantId}/chat`,
        icon: 'chat',
      },
      {
        id: 'benefits-dashboard',
        label: 'Benefits Dashboard',
        url: `/workday/${this.tenantId}/dashboard`,
        icon: 'dashboard',
      },
      {
        id: 'plan-comparison',
        label: 'Compare Plans',
        url: `/workday/${this.tenantId}/compare`,
        icon: 'compare',
      },
    ];
  }
}

/**
 * Create Workday integration instance
 */
export function createWorkdayIntegration(
  tenantId: string,
  config: DeploymentConfig
): WorkdayIntegration {
  if (config.mode !== 'workday' || !config.workday) {
    throw new Error('Invalid Workday configuration');
  }

  const ssoConfig: WorkdaySSOConfig = {
    issuer: config.workday.ssoConfig.issuer,
    ssoUrl: config.workday.ssoConfig.ssoUrl,
    certificate: config.workday.ssoConfig.certificate,
    jwksUrl: config.workday.ssoConfig.jwksUrl,
    requiredClaims: ['email', 'employeeId', 'companyId', 'groups'],
  };

  const embedConfig: WorkdayEmbedConfig = {
    containerId: config.workday.embedConfig.containerId,
    theme: config.workday.embedConfig.theme,
    height: config.workday.embedConfig.height,
    width: config.workday.embedConfig.width,
    responsive: true,
  };

  return new WorkdayIntegration(ssoConfig, embedConfig, tenantId);
}
