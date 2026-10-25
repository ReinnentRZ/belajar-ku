import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
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
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // JWT Plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
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
      apiV1.register(usersRoutes, { prefix: '/users' });
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
    // 1. Zod Validation Errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // 2. Custom Domain HTTP Errors (BadRequest, Unauthorized, Forbidden, NotFound, Conflict)
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        ...(error.errors !== undefined && { errors: error.errors }),
      });
    }

    // 3. Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : String(error.meta?.target || 'field');
        return reply.status(409).send({
          success: false,
          message: `Unique constraint violation on: ${target}`,
        });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          message: 'Requested database record not found',
        });
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({
          success: false,
          message: 'Foreign key constraint violation in database operation',
        });
      }
    }

    // 4. Fastify Schema / Built-in Validation Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const err = error as { statusCode?: number; message?: string };
      if (typeof err.statusCode === 'number') {
        return reply.status(err.statusCode).send({
          success: false,
          message: err.message || 'Request failed',
        });
      }
    }

    // 5. Unhandled Internal Server Errors (Do not expose internal stack trace)
    app.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  });

  return app;
}
