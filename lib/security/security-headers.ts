/**
 * Security Headers Middleware
 * Implements comprehensive security headers for compliance and protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    enabled: boolean;
    directives: Record<string, string[]>;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  xFrameOptions: {
    enabled: boolean;
    value: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
    allowFrom?: string;
  };
  xContentTypeOptions: {
    enabled: boolean;
  };
  xXSSProtection: {
    enabled: boolean;
    mode: 'block' | 'report';
    reportUri?: string;
  };
  referrerPolicy: {
    enabled: boolean;
    value: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  };
  permissionsPolicy: {
    enabled: boolean;
    features: Record<string, string[]>;
  };
  crossOriginEmbedderPolicy: {
    enabled: boolean;
    value: 'unsafe-none' | 'require-corp';
  };
  crossOriginOpenerPolicy: {
    enabled: boolean;
    value: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin';
  };
  crossOriginResourcePolicy: {
    enabled: boolean;
    value: 'same-site' | 'same-origin' | 'cross-origin';
  };
}

export class SecurityHeadersManager {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig) {
    this.config = config;
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
    try {
      // Content Security Policy
      if (this.config.contentSecurityPolicy.enabled) {
        const csp = this.buildContentSecurityPolicy(request);
        response.headers.set('Content-Security-Policy', csp);
      }

      // HTTP Strict Transport Security
      if (this.config.hsts.enabled && request.nextUrl.protocol === 'https:') {
        const hsts = this.buildHSTS();
        response.headers.set('Strict-Transport-Security', hsts);
      }

      // X-Frame-Options
      if (this.config.xFrameOptions.enabled) {
        const xFrameOptions = this.buildXFrameOptions();
        response.headers.set('X-Frame-Options', xFrameOptions);
      }

      // X-Content-Type-Options
      if (this.config.xContentTypeOptions.enabled) {
        response.headers.set('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection
      if (this.config.xXSSProtection.enabled) {
        const xXSSProtection = this.buildXXSSProtection();
        response.headers.set('X-XSS-Protection', xXSSProtection);
      }

      // Referrer Policy
      if (this.config.referrerPolicy.enabled) {
        response.headers.set('Referrer-Policy', this.config.referrerPolicy.value);
      }

      // Permissions Policy
      if (this.config.permissionsPolicy.enabled) {
        const permissionsPolicy = this.buildPermissionsPolicy();
        response.headers.set('Permissions-Policy', permissionsPolicy);
      }

      // Cross-Origin Embedder Policy
      if (this.config.crossOriginEmbedderPolicy.enabled) {
        response.headers.set('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy.value);
      }

      // Cross-Origin Opener Policy
      if (this.config.crossOriginOpenerPolicy.enabled) {
        response.headers.set('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy.value);
      }

      // Cross-Origin Resource Policy
      if (this.config.crossOriginResourcePolicy.enabled) {
        response.headers.set('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy.value);
      }

      // Additional security headers
      response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
      response.headers.set('X-Download-Options', 'noopen');
      response.headers.set('X-DNS-Prefetch-Control', 'off');

      // Cache control for sensitive endpoints
      if (this.isSensitiveEndpoint(request)) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
      }

      logger.debug('Security headers applied', {
        path: request.nextUrl.pathname,
        method: request.method,
        headersCount: Array.from(response.headers.keys()).length,
      });

      return response;
    } catch (error) {
      logger.error('Failed to apply security headers', {
        error: error.message,
        path: request.nextUrl.pathname,
      });
      return response;
    }
  }

  /**
   * Build Content Security Policy header
   */
  private buildContentSecurityPolicy(request: NextRequest): string {
    const directives = this.config.contentSecurityPolicy.directives;
    const cspParts: string[] = [];

    for (const [directive, sources] of Object.entries(directives)) {
      if (sources.length > 0) {
        cspParts.push(`${directive} ${sources.join(' ')}`);
      }
    }

    return cspParts.join('; ');
  }

  /**
   * Build HSTS header
   */
  private buildHSTS(): string {
    const parts = [`max-age=${this.config.hsts.maxAge}`];
    
    if (this.config.hsts.includeSubDomains) {
      parts.push('includeSubDomains');
    }
    
    if (this.config.hsts.preload) {
      parts.push('preload');
    }

    return parts.join('; ');
  }

  /**
   * Build X-Frame-Options header
   */
  private buildXFrameOptions(): string {
    const value = this.config.xFrameOptions.value;
    
    if (value === 'ALLOW-FROM' && this.config.xFrameOptions.allowFrom) {
      return `${value} ${this.config.xFrameOptions.allowFrom}`;
    }
    
    return value;
  }

  /**
   * Build X-XSS-Protection header
   */
  private buildXXSSProtection(): string {
    const parts = ['1'];
    
    if (this.config.xXSSProtection.mode === 'block') {
      parts.push('mode=block');
    } else if (this.config.xXSSProtection.mode === 'report' && this.config.xXSSProtection.reportUri) {
      parts.push(`report=${this.config.xXSSProtection.reportUri}`);
    }

    return parts.join('; ');
  }

  /**
   * Build Permissions Policy header
   */
  private buildPermissionsPolicy(): string {
    const features = this.config.permissionsPolicy.features;
    const policyParts: string[] = [];

    for (const [feature, allowlist] of Object.entries(features)) {
      if (allowlist.length === 0) {
        policyParts.push(`${feature}=()`);
      } else {
        policyParts.push(`${feature}=(${allowlist.join(' ')})`);
      }
    }

    return policyParts.join(', ');
  }

  /**
   * Check if endpoint is sensitive and requires no-cache headers
   */
  private isSensitiveEndpoint(request: NextRequest): boolean {
    const sensitivePaths = [
      '/api/auth',
      '/api/admin',
      '/api/documents',
      '/admin',
      '/workday',
    ];

    return sensitivePaths.some(path => request.nextUrl.pathname.startsWith(path));
  }
}

// Default security headers configuration
export const defaultSecurityHeadersConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'connect-src': ["'self'", 'https://api.openai.com', 'https://api.anthropic.com'],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: {
    enabled: true,
    value: 'SAMEORIGIN',
  },
  xContentTypeOptions: {
    enabled: true,
  },
  xXSSProtection: {
    enabled: true,
    mode: 'block',
  },
  referrerPolicy: {
    enabled: true,
    value: 'strict-origin-when-cross-origin',
  },
  permissionsPolicy: {
    enabled: true,
    features: {
      'camera': [],
      'microphone': [],
      'geolocation': [],
      'payment': [],
      'usb': [],
      'magnetometer': [],
      'gyroscope': [],
      'accelerometer': [],
      'ambient-light-sensor': [],
      'autoplay': [],
      'battery': [],
      'bluetooth': [],
      'display-capture': [],
      'document-domain': [],
      'encrypted-media': [],
      'fullscreen': ["'self'"],
      'gamepad': [],
      'midi': [],
      'notifications': [],
      'persistent-storage': [],
      'picture-in-picture': [],
      'publickey-credentials-get': [],
      'screen-wake-lock': [],
      'sync-xhr': [],
      'web-share': [],
      'xr-spatial-tracking': [],
    },
  },
  crossOriginEmbedderPolicy: {
    enabled: true,
    value: 'require-corp',
  },
  crossOriginOpenerPolicy: {
    enabled: true,
    value: 'same-origin',
  },
  crossOriginResourcePolicy: {
    enabled: true,
    value: 'same-origin',
  },
};

// Create security headers manager instance
export const securityHeadersManager = new SecurityHeadersManager(defaultSecurityHeadersConfig);
