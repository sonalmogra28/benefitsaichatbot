/** @type {import('next').NextConfig} */

// Security headers configuration
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob: https://avatar.vercel.sh",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.stack-auth.com https://api.openai.com https://*.vercel-insights.com https://*.posthog.com wss:// https://",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests"
    ].join('; ')
  }
];

const nextConfig = {
  experimental: {
    // PPR and auth cookies don't mix – disable until pages are adapted
    ppr: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ],
      },
    ];
  },
  // Disable x-powered-by header
  poweredByHeader: false,
  // Enable production source maps for error tracking
  productionBrowserSourceMaps: process.env.NODE_ENV === 'production' && process.env.ENABLE_SOURCE_MAPS === 'true',
  // Compress responses
  compress: true,
  // Generate build ID for deployments
  generateBuildId: async () => {
    // Use git commit hash if available, otherwise use timestamp
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA;
    }
    return `build-${Date.now()}`;
  },
  // Webpack configuration for additional security
  webpack: (config, { isServer }) => {
    // Disable source maps in production (unless explicitly enabled)
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SOURCE_MAPS !== 'true') {
      config.devtool = false;
    }
    
    // Add additional security-related webpack plugins here if needed
    
    return config;
  },
};

module.exports = nextConfig;