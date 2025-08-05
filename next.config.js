/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PPR and auth cookies don't mix – disable until pages are adapted
    ppr: false,
  },
};

module.exports = nextConfig;