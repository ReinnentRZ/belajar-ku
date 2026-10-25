/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional transparent reverse-proxy to Fastify backend if BACKEND_API_URL is defined
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.BACKEND_API_URL;
    if (!backendUrl) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
