import fs from 'fs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow cross-origin Fast Refresh and static chunk streaming through ngrok & Cloudflare tunnels
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.trycloudflare.com',
    'localhost:3000',
    '127.0.0.1:3000',
  ],

  // Extend chunk loading timeout in dev mode to prevent ChunkLoadError timeouts over tunnels
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.output.chunkLoadTimeout = 300000; // 300 seconds (5 minutes)
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'ngrok-skip-browser-warning', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },

  async rewrites() {
    // 1. Prioritize explicit environment variable if provided
    // 2. Inside Docker container, default to internal service network 'http://api:5000'
    // 3. Outside Docker (host machine local development), fallback to 'http://localhost:5000'
    const isDocker = fs.existsSync('/.dockerenv');
    const target =
      process.env.INTERNAL_API_URL ||
      process.env.BACKEND_API_URL ||
      (isDocker ? 'http://api:5000' : 'http://localhost:5000');

    const cleanTarget = target.replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${cleanTarget}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${cleanTarget}/health`,
      },
    ];
  },
};

export default nextConfig;
