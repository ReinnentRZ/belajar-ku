import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { ordersController } from './orders.controller.js';

export async function ordersRoutes(fastify: FastifyInstance) {
  // Public webhook endpoint for payment settlement
  fastify.post('/orders/webhook/payment', ordersController.handlePaymentWebhook);

  // Parent checkout and order views
  fastify.post(
    '/orders/checkout',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    ordersController.checkout
  );
  fastify.get(
    '/orders/mine',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    ordersController.getMyOrders
  );
  fastify.get(
    '/orders/:id',
    { preHandler: [authenticate] },
    ordersController.getOrderById
  );
  fastify.post(
    '/orders/:id/cancel',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    ordersController.cancelOrder
  );
}
