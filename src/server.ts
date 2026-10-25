import { buildApp } from './app.js';
import prisma from './config/database.js';
import { env } from './config/env.js';
import redis from './config/redis.js';

async function main() {
  const app = buildApp();

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database via Prisma');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', (err as Error).message);
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.connect().catch((err: Error) => {
      // If already connected or connecting, ioredis might reject connect() call
      if (!err.message.includes('already')) {
        throw err;
      }
    });
  } catch (err) {
    console.error('⚠️ Redis connection notice:', (err as Error).message);
  }

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      await app.close();
      console.log('✅ Fastify server closed');

      await prisma.$disconnect();
      console.log('✅ Prisma client disconnected');

      await redis.quit();
      console.log('✅ Redis connection closed');

      process.exit(0);
    } catch (err) {
      console.error('❌ Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start listening
  try {
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    console.log(`🚀 Belajar-Ku API Server is running at ${address}`);
    console.log(`📋 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health check available at: ${address}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
