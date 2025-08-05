/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PPR and auth cookies don't mix – disable until pages are adapted
    ppr: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'images.unsplash.com',
      },
      {
        hostname: 'lh3.googleusercontent.com', // Google profile images
      },
      {
        hostname: 'avatars.githubusercontent.com', // GitHub profile images
      },
    ],
  },
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // Optimize for auth flows
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/handler/sign-in',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/handler/sign-up',
        permanent: false,
      },
      {
        source: '/logout',
        destination: '/handler/sign-out',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;