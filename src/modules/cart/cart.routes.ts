import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { cartController } from './cart.controller.js';

export async function cartRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorizeRoles('PARENT'));

  fastify.post('/cart', cartController.addToCart);
  fastify.get('/cart', cartController.getCart);
  fastify.delete('/cart/:id', cartController.removeItem);
}
