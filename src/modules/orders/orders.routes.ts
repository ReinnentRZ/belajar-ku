import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { ordersController } from './orders.controller.js';

export async function ordersRoutes(fastify: FastifyInstance) {
  // Public webhook endpoint for payment settlement
  fastify.post('/orders/webhook/payment', ordersController.handlePaymentWebhook);

  // Buyer (Parent / Institution) checkout
  fastify.post(
    '/orders/checkout',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    ordersController.checkout
  );

  // Order history (accessible by Parent, Institution, and Tutor)
  fastify.get(
    '/orders/mine',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION', 'TUTOR')] },
    ordersController.getMyOrders
  );

  // Single order detail
  fastify.get(
    '/orders/:id',
    { preHandler: [authenticate] },
    ordersController.getOrderById
  );

  // Cancel order before payment
  fastify.post(
    '/orders/:id/cancel',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    ordersController.cancelOrder
  );

  // =========================================================================
  // Deliverable Escrow Endpoints
  // =========================================================================

  // Tutor uploads deliverable file
  fastify.post(
    '/orders/:id/upload-deliverable',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    ordersController.uploadDeliverable
  );

  // Protected download endpoint for buyer, tutor, or admin
  fastify.get(
    '/orders/:id/deliverables/:fileId/download',
    { preHandler: [authenticate] },
    ordersController.downloadDeliverable
  );

  // Buyer requests revision (max 2x)
  fastify.post(
    '/orders/:id/request-revision',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    ordersController.requestRevision
  );

  // Buyer or Admin completes & releases escrow
  fastify.post(
    '/orders/:id/complete-deliverable',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION', 'ADMIN')] },
    ordersController.completeDeliverable
  );
}
