import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { Prisma } from '@prisma/client';
import Fastify, { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { cartRoutes } from './modules/cart/cart.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { servicesRoutes } from './modules/services/services.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { HttpError } from './utils/errors.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Security & Cross-Origin
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, internal server-to-server proxies)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Check against explicit configured CORS origins
      if (allowedOrigins.includes(origin) || (env.FRONTEND_URL && origin.startsWith(env.FRONTEND_URL))) {
        cb(null, true);
        return;
      }

      // Allow localhost, 127.0.0.1, Cloudflare tunnels (*.trycloudflare.com), and Vercel deployments (*.vercel.app)
      try {
        const url = new URL(origin);
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.endsWith('.trycloudflare.com') ||
          url.hostname.endsWith('.vercel.app')
        ) {
          cb(null, true);
          return;
        }
      } catch {
        // Fallback
      }

      // Dynamically allow origins to support arbitrary Cloudflare tunnel URLs seamlessly
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      'ngrok-skip-browser-warning',
      'Ngrok-Skip-Browser-Warning',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
    ],
  });

  // JWT Plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Multipart File Upload Plugin (50MB Limit)
  app.register(multipart, {
    limits: {
      fileSize: 52428800, // 50MB in bytes
      files: 5,
    },
  });

  // Root Welcome Route
  app.get('/', async () => {
    return {
      success: true,
      name: 'Belajar-Ku API',
      version: '1.0.0',
      description: 'Production REST API for Tutoring Marketplace & School Administration Platform',
      health: '/health',
      endpoints: '/api/v1',
      frontend: env.FRONTEND_URL,
    };
  });

  // Health Check
  app.get('/health', async () => {
    return {
      success: true,
      message: 'Belajar-Ku API is healthy and operational',
      timestamp: new Date().toISOString(),
    };
  });

  // Module Routes Aggregator under /api/v1
  app.register(
    async (apiV1) => {
      apiV1.register(authRoutes, { prefix: '/auth' });
      apiV1.register(authRoutes); // Alias for /register and /login directly under /api/v1
      apiV1.register(usersRoutes, { prefix: '/users' });
      apiV1.register(usersRoutes); // Alias for /students and /tutor/me directly under /api/v1
      apiV1.register(servicesRoutes);
      apiV1.register(cartRoutes);
      apiV1.register(ordersRoutes);
      apiV1.register(sessionsRoutes);
      apiV1.register(reportsRoutes);
      apiV1.register(adminRoutes);
    },
    { prefix: '/api/v1' }
  );

  // Centralized Global Error Handler
  app.setErrorHandler((error, _request, reply) => {
    // 0. Multipart Oversized File Error
    if ((error as any).code === 'FST_REQ_FILE_TOO_LARGE' || (error as any).statusCode === 413) {
      return reply.status(413).send({
        success: false,
        statusCode: 413,
        code: 'FILE_TOO_LARGE',
        message: 'Ukuran file melebihi batas maksimal 50MB (52,428,800 bytes)',
      });
    }

    // 1. Zod Validation Errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Data yang dimasukkan tidak valid',
        errors: error.errors.map((e) => ({
          field: e.path.join('.') || 'root',
          message: e.message,
        })),
      });
    }

    // 2. JWT / Auth Token Errors
    const errorCode = (error as any).code;
    if (typeof errorCode === 'string' && errorCode.startsWith('FST_JWT_')) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan masuk kembali.',
      });
    }

    // 3. Custom Domain HTTP Errors (BadRequest, Unauthorized, Forbidden, NotFound, Conflict)
    if (error instanceof HttpError) {
      let code = error.code;
      // Detect slot lock concurrency error
      if (
        error.statusCode === 409 &&
        (code === 'SLOT_LOCKED' || error.message.includes('Jadwal guru sudah dipesan'))
      ) {
        code = 'SLOT_LOCKED';
      }

      return reply.status(error.statusCode).send({
        success: false,
        statusCode: error.statusCode,
        code,
        message: error.message,
        ...(error.errors !== undefined && { errors: error.errors }),
      });
    }

    // 4. Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : String(error.meta?.target || 'field');
        const isEmailOrPhone =
          target.toLowerCase().includes('email') || target.toLowerCase().includes('phone');
        return reply.status(409).send({
          success: false,
          statusCode: 409,
          code: 'CONFLICT',
          message: isEmailOrPhone
            ? 'Email atau nomor telepon sudah terdaftar'
            : `Data ${target} sudah terdaftar`,
        });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Data yang dicari tidak ditemukan di database',
        });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Operasi gagal: data terkait tidak valid dalam relasi database',
        });
      }
    }

    // 5. Fastify Schema / Built-in Validation Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const err = error as { statusCode?: number; message?: string; validation?: any[] };
      if (err.statusCode === 400 && Array.isArray(err.validation)) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Data yang dimasukkan tidak valid',
          errors: err.validation.map((v) => ({
            field: v.instancePath
              ? v.instancePath.replace(/^\//, '').replace(/\//g, '.')
              : v.params?.missingProperty || 'root',
            message: v.message || 'Validasi schema gagal',
          })),
        });
      }
      if (typeof err.statusCode === 'number') {
        return reply.status(err.statusCode).send({
          success: false,
          statusCode: err.statusCode,
          code:
            err.statusCode === 401
              ? 'UNAUTHORIZED'
              : err.statusCode === 403
              ? 'FORBIDDEN'
              : err.statusCode === 404
              ? 'NOT_FOUND'
              : 'BAD_REQUEST',
          message: err.message || 'Request failed',
        });
      }
    }

    // 6. Unhandled Internal Server Errors (Do not expose internal stack trace)
    const reqId = _request.id || 'req-unknown';
    app.log.error({ reqId, err: error }, 'Unhandled internal server error');
    return reply.status(500).send({
      success: false,
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan internal pada server',
    });
  });

  return app;
}
