/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Security headers configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Prevent clickjacking attacks
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Prevent MIME type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block' // Enable XSS protection (legacy browsers)
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin' // Control referrer information
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' // Restrict browser features
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload' // Force HTTPS
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com",
              "frame-src 'self' https://accounts.google.com https://firebase.googleapis.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
  },

  // Additional security configurations
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Restrict image domains for next/image
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'lh3.googleusercontent.com' // Google profile images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
        pathname: '/**'
      }
    ]
  },

  // Environment variable validation
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV
  },

  // Webpack configuration for additional security
  webpack: (config, { isServer }) => {
    // Disable source maps in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }

    // Add security-related webpack plugins if needed
    return config;
  }
};

export default nextConfig;
