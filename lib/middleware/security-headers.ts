/**
 * Security headers middleware for enhanced security
 */

import { NextRequest, NextResponse } from 'next/server';

export function securityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.create(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.googleapis.com https://*.azureapp.com https://*.azureio.com wss://*.azureio.com https://*.openai.azure.com https://*.search.windows.net",
      "frame-src 'self' https://*.workday.com https://*.myworkday.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors https://*.workday.com https://*.myworkday.com",
    ].join('; ')
  );

  // Prevent MIME type sniffing
  response.headers.create('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.create('X-Frame-Options', 'DENY');

  // XSS Protection
  response.headers.create('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.create('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.create(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security (only in production with HTTPS)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.create(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}
