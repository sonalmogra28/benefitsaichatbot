/**
 * Security headers middleware for enhanced security
 */

import { NextRequest, NextResponse } from 'next/server';

export function securityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.set(
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
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security (only in production with HTTPS)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}
