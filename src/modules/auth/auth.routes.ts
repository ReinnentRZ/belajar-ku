import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authController } from './auth.controller.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.get('/me', { preHandler: [authenticate] }, authController.me);
  fastify.put('/profile', { preHandler: [authenticate] }, authController.updateProfile);
  fastify.put('/password', { preHandler: [authenticate] }, authController.changePassword);
  fastify.patch('/password', { preHandler: [authenticate] }, authController.changePassword);
}
