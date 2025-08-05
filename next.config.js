/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;