/**
 * Subdomain deployment utilities
 * Handles subdomain routing, SSL, CDN, and standalone deployment
 */

import { DeploymentConfig } from './index';

export interface SubdomainConfig {
  domain: string;
  ssl: boolean;
  cdn: boolean;
  customDomain?: string;
}

export interface SubdomainRouting {
  tenantId: string;
  subdomain: string;
  domain: string;
  sslEnabled: boolean;
  cdnEnabled: boolean;
}

export class SubdomainDeployment {
  private config: SubdomainConfig;
  private tenantId: string;

  constructor(config: SubdomainConfig, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  /**
   * Get the full subdomain URL
   */
  getSubdomainUrl(): string {
    const protocol = this.config.ssl ? 'https' : 'http';
    const domain = this.config.customDomain || this.config.domain;
    return `${protocol}://${domain}`;
  }

  /**
   * Get the API URL for this subdomain
   */
  getApiUrl(): string {
    return `${this.getSubdomainUrl()}/api`;
  }

  /**
   * Get the auth URL for this subdomain
   */
  getAuthUrl(): string {
    return `${this.getSubdomainUrl()}/auth`;
  }

  /**
   * Generate DNS configuration
   */
  generateDNSConfig(): {
    type: string;
    name: string;
    value: string;
    ttl: number;
  }[] {
    const records = [];

    // A record for the subdomain
    records.push({
      type: 'A',
      name: this.extractSubdomain(),
      value: process.env.SUBDOMAIN_IP || '127.0.0.1',
      ttl: 300,
    });

    // CNAME for www subdomain
    records.push({
      type: 'CNAME',
      name: `www.${this.extractSubdomain()}`,
      value: this.config.domain,
      ttl: 300,
    });

    // SSL certificate validation record
    if (this.config.ssl) {
      records.push({
        type: 'TXT',
        name: `_acme-challenge.${this.extractSubdomain()}`,
        value: 'SSL_CERTIFICATE_VALIDATION_TOKEN',
        ttl: 300,
      });
    }

    return records;
  }

  /**
   * Generate CDN configuration
   */
  generateCDNConfig(): {
    origin: string;
    cacheBehaviors: Array<{
      pathPattern: string;
      ttl: number;
      compress: boolean;
    }>;
    customHeaders: Array<{
      name: string;
      value: string;
    }>;
  } {
    return {
      origin: this.getSubdomainUrl(),
      cacheBehaviors: [
        {
          pathPattern: '/api/*',
          ttl: 0, // No cache for API calls
          compress: true,
        },
        {
          pathPattern: '/static/*',
          ttl: 31536000, // 1 year for static assets
          compress: true,
        },
        {
          pathPattern: '/*',
          ttl: 3600, // 1 hour for HTML pages
          compress: true,
        },
      ],
      customHeaders: [
        {
          name: 'X-Tenant-ID',
          value: this.tenantId,
        },
        {
          name: 'X-Deployment-Mode',
          value: 'subdomain',
        },
      ],
    };
  }

  /**
   * Generate Nginx configuration
   */
  generateNginxConfig(): string {
    const domain = this.config.customDomain || this.config.domain;
    const sslConfig = this.config.ssl ? `
    ssl_certificate /etc/ssl/certs/${domain}.crt;
    ssl_certificate_key /etc/ssl/private/${domain}.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;` : '';

    return `
server {
    listen 80${this.config.ssl ? ' ssl' : ''};
    server_name ${domain} www.${domain};
    
    ${sslConfig}
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Tenant identification
    add_header X-Tenant-ID "${this.tenantId}" always;
    add_header X-Deployment-Mode "subdomain" always;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
    `.trim();
  }

  /**
   * Generate Docker configuration
   */
  generateDockerConfig(): {
    dockerfile: string;
    dockerCompose: string;
    environment: Record<string, string>;
  } {
    const domain = this.config.customDomain || this.config.domain;
    
    return {
      dockerfile: `
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS runner
WORKDIR /app
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=https://${domain}
ENV NEXT_PUBLIC_TENANT_ID=${this.tenantId}
ENV NEXT_PUBLIC_DEPLOYMENT_MODE=subdomain
CMD ["npm", "start"]
      `.trim(),
      
      dockerCompose: `
version: '3.8'
services:
  benefits-chatbot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://${domain}
      - NEXT_PUBLIC_TENANT_ID=${this.tenantId}
      - NEXT_PUBLIC_DEPLOYMENT_MODE=subdomain
    volumes:
      - ./data:/app/data
    restart: unless-stopped
      `.trim(),
      
      environment: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: `https://${domain}`,
        NEXT_PUBLIC_TENANT_ID: this.tenantId,
        NEXT_PUBLIC_DEPLOYMENT_MODE: 'subdomain',
        NEXT_PUBLIC_TENANT_DOMAIN: domain,
      },
    };
  }

  /**
   * Extract subdomain from domain
   */
  private extractSubdomain(): string {
    const parts = this.config.domain.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    return this.config.domain;
  }

  /**
   * Validate subdomain configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.domain) {
      errors.push('Domain is required');
    }

    if (this.config.ssl && !this.config.customDomain) {
      errors.push('Custom domain is required for SSL');
    }

    if (this.config.domain && !this.isValidDomain(this.config.domain)) {
      errors.push('Invalid domain format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if domain format is valid
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }
}

/**
 * Create subdomain deployment instance
 */
export function createSubdomainDeployment(
  tenantId: string,
  config: DeploymentConfig
): SubdomainDeployment {
  if (config.mode !== 'subdomain' || !config.subdomain) {
    throw new Error('Invalid subdomain configuration');
  }

  return new SubdomainDeployment(config.subdomain, tenantId);
}
