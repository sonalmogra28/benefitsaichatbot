import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // Rewrite auth API routes to the Stack Auth handler
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/handler/:path*',
      },
    ];
  },
};

export default nextConfig;
